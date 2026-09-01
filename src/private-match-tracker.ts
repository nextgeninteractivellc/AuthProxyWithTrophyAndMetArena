// ============================================================================
// AUTHPROXY - PRIVATE MATCH TRACKER MODULE
// Monitors key_value_pairs table for private match completions
// and bridges them to the skill table so StatsWatcher can track them
// ============================================================================

import { PrismaClient } from '@prisma/client';
import Logger from './logger';

const log = new Logger();

interface PrivateMatchStats {
    total_games_played: number;
    wins: number;
    mvps: number;
    win_streak: number;
}

interface PrivateMatchCache extends PrivateMatchStats {
    username: string;
    publisherUsername: string;
}

export class PrivateMatchTracker {
    private gamePrisma: PrismaClient;
    private privateMatchCache: Map<string, PrivateMatchCache> = new Map();
    private pollIntervalMs: number = 5000; // Poll every 5 seconds
    private pollInterval: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;

    constructor(gamePrisma: PrismaClient) {
        this.gamePrisma = gamePrisma;
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            log.warn('[PrivateMatchTracker] Already running');
            return;
        }

        this.isRunning = true;
        log.info('[PrivateMatchTracker] Starting private match tracking...');
        
        // Initial cache population
        await this.populateCache();
        
        // Start polling
        this.pollInterval = setInterval(() => this.poll(), this.pollIntervalMs);
        
        log.info('[PrivateMatchTracker] Private match tracking enabled');
    }

    async stop(): Promise<void> {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.isRunning = false;
        log.info('[PrivateMatchTracker] Stopped');
    }

    private async populateCache(): Promise<void> {
        try {
            const result = await this.gamePrisma.$queryRaw<any[]>`
                SELECT 
                    user_id,
                    MAX(CASE WHEN key = 'total_games_played' THEN value::integer ELSE 0 END) as total_games_played,
                    MAX(CASE WHEN key LIKE 'lt.tko.wins_match' OR key LIKE 'sn%.tko.wins_match' THEN value::integer ELSE 0 END) as wins,
                    MAX(CASE WHEN key LIKE 'lt.tko.match_mvp' OR key LIKE 'sn%.tko.match_mvp' THEN value::integer ELSE 0 END) as mvps,
                    MAX(CASE WHEN key = 'win_streak' THEN value::integer ELSE 0 END) as win_streak
                FROM key_value_pairs
                WHERE key IN ('total_games_played', 'win_streak')
                   OR key LIKE '%.tko.wins_match'
                   OR key LIKE '%.tko.match_mvp'
                GROUP BY user_id
            `;

            for (const row of result) {
                this.privateMatchCache.set(row.user_id.toString(), {
                    total_games_played: row.total_games_played || 0,
                    wins: row.wins || 0,
                    mvps: row.mvps || 0,
                    win_streak: row.win_streak || 0,
                    username: '',
                    publisherUsername: ''
                });
            }

            log.info(`[PrivateMatchTracker] Cached ${result.length} player records`);
        } catch (error: any) {
            log.err(`[PrivateMatchTracker] Error populating cache: ${error.message}`);
        }
    }

    private async poll(): Promise<void> {
        try {
            // Get current stats from key_value_pairs
            const result = await this.gamePrisma.$queryRaw<any[]>`
                SELECT 
                    kv.user_id,
                    u.username,
                    u.publisher_username,
                    MAX(CASE WHEN key = 'total_games_played' THEN value::integer ELSE 0 END) as total_games_played,
                    MAX(CASE WHEN key LIKE 'lt.tko.wins_match' OR key LIKE 'sn%.tko.wins_match' THEN value::integer ELSE 0 END) as wins,
                    MAX(CASE WHEN key LIKE 'lt.tko.match_mvp' OR key LIKE 'sn%.tko.match_mvp' THEN value::integer ELSE 0 END) as mvps,
                    MAX(CASE WHEN key = 'win_streak' THEN value::integer ELSE 0 END) as win_streak
                FROM key_value_pairs kv
                JOIN users u ON kv.user_id = u.id
                WHERE key IN ('total_games_played', 'win_streak')
                   OR key LIKE '%.tko.wins_match'
                   OR key LIKE '%.tko.match_mvp'
                GROUP BY kv.user_id, u.username, u.publisher_username
            `;

            for (const row of result) {
                const userId = row.user_id.toString();
                const cached = this.privateMatchCache.get(userId);
                
                const currentStats: PrivateMatchStats = {
                    total_games_played: row.total_games_played || 0,
                    wins: row.wins || 0,
                    mvps: row.mvps || 0,
                    win_streak: row.win_streak || 0
                };

                // Match completed - games played increased
                if (cached && currentStats.total_games_played > cached.total_games_played) {
                    log.info(`[PrivateMatchTracker] Match completed for user ${row.user_id} (${row.username})`);
                    await this.updateSkillTable(
                        row.user_id,
                        currentStats,
                        row.username,
                        row.publisher_username
                    );
                }

                // Update cache
                this.privateMatchCache.set(userId, {
                    ...currentStats,
                    username: row.username,
                    publisherUsername: row.publisher_username
                });
            }
        } catch (error: any) {
            log.err(`[PrivateMatchTracker] Error polling: ${error.message}`);
        }
    }

    private async updateSkillTable(
        userId: number,
        stats: PrivateMatchStats,
        username: string,
        publisherUsername: string
    ): Promise<void> {
        try {
            const PRIVATE_MATCH_FLOW = 0; // Custom/Private matches
            const DEFAULT_PLAYLIST_GUID = '00000000-0000-0000-0000-000000000000';
            const now = Math.floor(Date.now() / 1000);

            // Insert or update skill table
            await this.gamePrisma.$executeRaw`
                INSERT INTO skill (
                    user_id, 
                    playlist_guid, 
                    match_flow, 
                    total_games_played, 
                    wins, 
                    mvps,
                    current_mmr,
                    current_tier,
                    current_division,
                    current_division_progress,
                    volatility,
                    win_streak,
                    timestamp,
                    season
                ) VALUES (
                    ${userId}, 
                    ${DEFAULT_PLAYLIST_GUID}::uuid, 
                    ${PRIVATE_MATCH_FLOW}, 
                    ${stats.total_games_played}, 
                    ${stats.wins}, 
                    ${stats.mvps},
                    2500,
                    0,
                    0,
                    0,
                    100,
                    ${stats.win_streak},
                    ${now},
                    9
                )
                ON CONFLICT (user_id, playlist_guid, match_flow)
                DO UPDATE SET
                    total_games_played = ${stats.total_games_played},
                    wins = ${stats.wins},
                    mvps = ${stats.mvps},
                    win_streak = ${stats.win_streak},
                    timestamp = ${now}
            `;

            log.info(`[PrivateMatchTracker] ✓ Updated skill table - User ${userId}: ${stats.total_games_played} games, ${stats.wins} wins, ${stats.mvps} MVPs`);
        } catch (error: any) {
            log.err(`[PrivateMatchTracker] Error updating skill table for user ${userId}: ${error.message}`);
        }
    }

    getStatus(): { running: boolean; cachedPlayers: number } {
        return {
            running: this.isRunning,
            cachedPlayers: this.privateMatchCache.size
        };
    }
}

export default PrivateMatchTracker;
