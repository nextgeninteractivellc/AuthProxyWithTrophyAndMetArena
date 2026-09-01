import 'dotenv/config';
import axios from 'axios';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import config from './config';
import { createClient } from 'redis';
import { PrismaClient } from '@prisma/client'
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import Logger from './logger'
import { StatsWatcher } from './stats-watcher';
import { TrophyWebhook } from './webhooks-trophy';
import { MetArenaWebhook } from './webhooks-metarena';
import { TrainingGoalsWebhook } from './webhooks-training';
import { EngagementTracker } from './engagement-tracker';
import { authError, authResponse, authErrorData } from './interfaces'

const log = new Logger();

if (config.name == "ServerName") log.warn("Please change the name in the config.json or via the environment (SERVER_NAME)");

const redis = createClient({
    socket: {
        host: config.redis.host,
        port: config.redis.port,
    },
    password: config.redis.password,
});
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: config.postgres,
        }
    }
});

// ============================================================================
// SUPABASE CLIENT - Trophy username override
// ============================================================================
// Reads pledge_signers.game_username via IP-based session lookup
// against early_access_sessions. Falls back to client-reported username
// if no session is found (preserves backward compatibility for testing).
//
// Required env vars:
//   TROPHY_SUPABASE_URL
//   TROPHY_SUPABASE_SERVICE_KEY
// ============================================================================
const TROPHY_SUPABASE_URL = process.env.SESSIONS_SUPABASE_URL || '';
const TROPHY_SUPABASE_SERVICE_KEY = process.env.SESSIONS_SUPABASE_SERVICE_KEY || '';

const trophySupabase = (TROPHY_SUPABASE_URL && TROPHY_SUPABASE_SERVICE_KEY)
    ? createSupabaseClient(TROPHY_SUPABASE_URL, TROPHY_SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    : null;

if (trophySupabase) {
    log.info(`[Trophy] Session client initialized: ${TROPHY_SUPABASE_URL}`);
} else {
    log.err('[Trophy] SESSIONS_SUPABASE_URL / SESSIONS_SUPABASE_SERVICE_KEY not set. Username validation is DISABLED and any client can claim any username.');
}

/**
 * Look up the verified Trophy game_username for a given IP address.
 * Returns null if no active session is found OR if the signer hasn't
 * set a game_username (caller should fall back).
 */
async function lookupTrophyUsername(ip: string): Promise<{ gameUsername: string; linkedinId: string } | null> {
    if (!trophySupabase) return null;
    if (!ip) return null;

    try {
        // Strip IPv6 prefix if present (express sometimes prefixes ::ffff:)
        const cleanIp = ip.replace(/^::ffff:/, '');

        // Lookup active session for this IP
        const { data: session, error: sessionErr } = await trophySupabase
            .from('early_access_sessions')
            .select('linkedin_id')
            .eq('ip', cleanIp)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (sessionErr) {
            log.err(`[Trophy] Session lookup error for IP ${cleanIp}: ${sessionErr.message}`);
            return null;
        }
        if (!session) return null;

        // Lookup game_username from pledge_signers
        const { data: signer, error: signerErr } = await trophySupabase
            .from('pledge_signers')
            .select('game_username, name')
            .eq('linkedin_id', session.linkedin_id)
            .maybeSingle();

        if (signerErr) {
            log.err(`[Trophy] Signer lookup error: ${signerErr.message}`);
            return null;
        }
        if (!signer) return null;

        // Use game_username if set, else first name from full name
        const resolvedName = signer.game_username
            || (signer.name || '').trim().split(/\s+/)[0]
            || null;

        if (!resolvedName) return null;

        return { gameUsername: resolvedName, linkedinId: session.linkedin_id };
    } catch (err: any) {
        log.err(`[Trophy] Unexpected lookup error: ${err.message}`);
        return null;
    }
}

redis.connect().then(() => {
    log.info("Connected to Redis");
}).catch((err: any) => {
    log.fatal("Failed to connect to Redis");
    log.fatal(err.message);
    log.fatal(err.stack ? err.stack.toString() : '');
    process.exit(1);
});

prisma.$connect().then(() => {
    log.info("Connected to Postgres");
}).catch((err: any) => {
    log.fatal("Failed to connect to Postgres");
    log.fatal(err.message);
    log.fatal(err.stack ? err.stack.toString() : '');
    process.exit(1);
});

// Initialize webhooks
const trophyWebhook = config.trophy.enabled ? new TrophyWebhook(config.trophy) : null;
const metarenaWebhook = config.metarena.enabled ? new MetArenaWebhook(config.metarena) : null;

const engagementTracker = config.engagement.enabled ? new EngagementTracker({
    enabled: true,
    apiUrl: config.engagement.apiUrl,
    apiSecret: config.engagement.apiSecret
}) : null;

const trainingGoalsWebhook = config.trainingGoals.enabled ? new TrainingGoalsWebhook({
    enabled: true,
    supabaseUrl: config.trainingGoals.supabaseUrl,
    supabaseServiceKey: config.trainingGoals.supabaseServiceKey
}, engagementTracker) : null;

const statsWatcher = new StatsWatcher(config.statsWatcher, trophyWebhook, metarenaWebhook, trainingGoalsWebhook, engagementTracker);
setTimeout(() => {
    statsWatcher.start().catch(err => {
        log.err(`Failed to start stats watcher: ${err.message}`);
    });
}, 2000);

const app = express();

app.use(express.json());

// Trust proxy headers so req.ip reflects the real client IP behind any
// reverse proxy. Adjust if needed for your deployment topology.
app.set('trust proxy', true);

app.get('/stats/status', async (req, res) => {
    res.send({
        status: "OK",
        version: require('../package.json').version,
        uptime: process.uptime(),
        connections: (await redis.KEYS('user:session:*')).length,
        maxConnections: config.maxPlayers,
    });
});

app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    log.info(`Request from ${req.ip} to ${req.url}`);
    res.set('X-Powered-By', 'KoCity Proxy');

    if (!req.body.credentials) {
        log.info("No credentials");
        return next();
    }

    const authkey = req.body.credentials.username

    if (!authkey) {
        log.info("Invalid credentials");
        return res.status(401).send("Invalid credentials");
    }

    // ========================================================================
    // TROPHY USERNAME OVERRIDE
    // Look up the player's verified game_username from pledge_signers via
    // their IP-based session in early_access_sessions. If found, use the
    // verified name. If not found, fall back to the client-reported name
    // (preserves backward compatibility).
    // ========================================================================
    const clientReportedName = authkey.split(':')[0] || 'TestPlayer';

    // Determine source IP. Prefer x-forwarded-for if set; fall back to req.ip.
    const sourceIp = (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim() || req.ip || '';

    let username = clientReportedName;
    let trophyLinkedinId: string | null = null;

    const trophyMatch = await lookupTrophyUsername(sourceIp);
    if (trophyMatch) {
        username = trophyMatch.gameUsername;
        trophyLinkedinId = trophyMatch.linkedinId;
        log.info(`[Trophy] IP ${sourceIp} matched linkedin_id ${trophyLinkedinId.substring(0, 8)}... → username: ${username}`);
    } else {
        log.info(`[Trophy] No active session for IP ${sourceIp}; using client-reported username: ${clientReportedName}`);
    }

    // Generate unique velanID from FINAL username (consistent across reconnects)
    let velanID = 0;
    for (let i = 0; i < username.length; i++) {
        velanID = ((velanID << 5) - velanID) + username.charCodeAt(i);
        velanID = velanID & velanID;
    }
    velanID = Math.abs(velanID);

    const response = {
        data: {
            username: username,
            velanID: velanID,
            color: null
        }
    } as unknown as authResponse;
    log.info(`[Auth] Resolved: ${response.data.username} (ID: ${velanID})${trophyLinkedinId ? ' [Trophy-verified]' : ' [client-reported]'}`);


    if (!response) return log.info("Request denied");

    if (!response.data?.username) {
        log.info("Request denied");
        return res.status(401).send("Unauthorized");
    }

    if (!response.data.velanID) {
        let localUser = await prisma.users.findFirst({
            where: {
                username: response.data.username,
            }
        });

        let velanID: number | undefined;
        if (!localUser) {
            const createdUser = await axios.post(`http://${config.internal.host}:${config.internal.port}/api/auth`, {
                credentials: {
                    username: response.data.username,
                    platform: "win64",
                    pid: 0,
                    system_guid: "0",
                    version: 269701,
                    build: "final",
                    boot_session_guid: "0",
                    is_using_epic_launcher: false
                },
                auth_provider: "dev"
            })

            velanID = createdUser.data.user.id.velan
        } else velanID = Number(localUser.id)

        const saved = await axios.post(`${config.authServer}/auth/connect`, {
            authkey,
            server: config.publicAddr,
            velanID
        }).catch((err: authError): null => {
            res.status(401).send("Unauthorized");
            if (err.response) log.err(`${(err.response.data as authErrorData).type} ${(err.response.data as authErrorData).message}`);
            else log.err(err.message);
            return null;
        });
        if (!saved) return log.info("Request denied");

        response.data.velanID = velanID;
    }
    if (!response.data.velanID) return log.info("Request denied");

    await prisma.users.upsert({
        where: {
            id: Number(response.data.velanID)
        },
        update: {
            username: `${response.data.color ? `:${response.data.color}FF:` : ''}${response.data.username}`
        },
        create: {
            id: Number(response.data.velanID),
            username: `${response.data.color ? `:${response.data.color}FF:` : ''}${response.data.username}`,
            auth_provider: 'dev',
            publisher_username: response.data.username,
            last_authenticated_persona_namespace: 'dev'
        }
    })

    log.info(`Request accepted for ${response.data.username}`);

    if (engagementTracker) {
        engagementTracker.onPlayerConnected(
            response.data.username,
            req.body.credentials.username.split(':')[0] || response.data.username
        ).catch(() => {});
    }

    req.body.credentials.username = `${response.data.color ? `:${response.data.color}FF:` : ''}${response.data.username}`
    req.body.auth_provider = 'dev'
    req.headers['content-length'] = Buffer.byteLength(JSON.stringify(req.body)).toString();
    next();
})

const proxy = createProxyMiddleware({
    target: `http://${config.internal.host}:${config.internal.port}`,
    changeOrigin: true,
    ws: true,
    onProxyReq: (proxyReq, req, res, options) => {
        if (req.url.includes('status')) return;
        log.info(`>> TO SERVER: ${req.method} ${req.url}`);
        if (req.body) log.info(`>> BODY: ${JSON.stringify(req.body).substring(0, 500)}`);
        proxyReq.end(JSON.stringify(req.body));
    },
    onProxyRes: (proxyRes, req, res) => {
        let body = '';
        proxyRes.on('data', (chunk) => { body += chunk; });
        proxyRes.on('end', () => {
            if (body && (req.url.includes('match') || req.url.includes('game') || req.url.includes('result'))) {
                log.info(`<< FROM SERVER: ${req.url}`);
                log.info(`<< RESPONSE: ${body.substring(0, 500)}`);
            }
        });
    }
})

app.all('*', proxy)

const server = app.listen(config.external.port, () => {
    log.info(`Listening on port ${config.external.port}`);
});


process.on('uncaughtException', function (err: Error) {
    log.fatal(err.message);
    log.fatal(err.stack ? err.stack.toString() : '');
});

process.on('unhandledRejection', function (err: Error) {
    log.fatal(err.message);
    log.fatal(err.stack ? err.stack.toString() : '');
});
