// ============================================================================
// AUTHPROXY - ENHANCED STATS WATCHER MODULE
// Monitors game database for match completions and detailed KPIs
// WITH DEBOUNCE - Prevents duplicate match events
// ============================================================================

import { PrismaClient } from '@prisma/client';
import Logger from './logger';
import { TrophyWebhook } from './webhooks-trophy';
import { MetArenaWebhook } from './webhooks-metarena';
import { PrivateMatchTracker } from './private-match-tracker';
import { TrainingGoalsWebhook } from './webhooks-training';
import { EngagementTracker } from './engagement-tracker';

const log = new Logger();

export interface StatsWatcherConfig {
    enabled: boolean;
    gameDbUrl: string;
    pollIntervalMs: number;
}

// ============================================================================
// MATCH DEBOUNCER - Prevents duplicate match events
// ============================================================================

class MatchDebouncer {
    private recentMatches: Map<string, number> = new Map();
    private cooldownMs: number;

    constructor(cooldownMs: number = 5000) {
        this.cooldownMs = cooldownMs;
    }

    /**
     * Check if this match event is a duplicate
     * @returns true if duplicate (should skip), false if new match
     */
    isDuplicate(username: string, kpis: any, gamesPlayed: number): boolean {
        // Create a unique hash from match signature
        const hash = this.createMatchHash(username, kpis, gamesPlayed);
        const lastSeen = this.recentMatches.get(hash);
        const now = Date.now();

        if (lastSeen && (now - lastSeen) < this.cooldownMs) {
            log.debug(`[StatsWatcher] Debounce: Duplicate match event for ${username} (hash: ${hash.substring(0, 16)}...)`);
            return true;
        }

        // Record this match
        this.recentMatches.set(hash, now);
        
        // Cleanup old entries
        this.cleanup();
        
        return false;
    }

    private createMatchHash(username: string, kpis: any, gamesPlayed: number): string {
        // Create hash from key match identifiers
        const signature = [
            username,
            gamesPlayed,
            kpis.kos || 0,
            kpis.assists || 0,
            kpis.catches || 0,
            kpis.passes || 0,
            kpis.double_kos || 0,
            kpis.triple_kos || 0
        ].join('-');
        
        return signature;
    }

    private cleanup(): void {
        const now = Date.now();
        const expiry = this.cooldownMs * 2;
        
        for (const [hash, time] of this.recentMatches) {
            if (now - time > expiry) {
                this.recentMatches.delete(hash);
            }
        }
    }

    getStats(): { trackedMatches: number; oldestEntry: number | null } {
        let oldest: number | null = null;
        for (const time of this.recentMatches.values()) {
            if (oldest === null || time < oldest) {
                oldest = time;
            }
        }
        return {
            trackedMatches: this.recentMatches.size,
            oldestEntry: oldest ? Date.now() - oldest : null
        };
    }
}

// ============================================================================
// CONTRACT GUID MAPPINGS - Maps game contract GUIDs to stat names
// ============================================================================

const CONTRACT_STAT_MAPPINGS: Record<string, string> = {
    // Core KO Stats
    'c2929d0c-3830-54c0-567e-a84501d6771c': 'total_kos',
    'c2929d0c-5a78-54c0-6624-f2be01d6e896': 'raw_kos',
    'c2929d0c-5ac8-54c0-11c8-1f6d01d6e828': 'special_kos',
    
    // Multi-KO Stats
    'c2929d0c-3830-54c0-ff8e-9bb101d6771c': 'double_kos',
    'c2929d0c-3830-54c0-d3d9-d79701d6771c': 'triple_kos',
    'c2929d0c-3830-54c0-9f48-d77101d6771c': 'ultimate_kos',
    
    // KO Types
    'c2929d0c-5a78-54c0-6cf1-05a801d6e898': 'death_from_above',
    'c2929d0c-3838-54c0-453b-2e6101d6e5d0': 'ko_streaks',
    
    // Passing Stats  
    'c2929d0c-5ac8-54c0-07f3-142401d6e827': 'passes',
    'c2929d0c-4334-54c0-ec8a-3c1201d6c8e5': 'curve_passes',
    'c2929d0c-5ac8-54c0-7464-df8d01d6e827': 'lob_passes',
    
    // Catch Stats
    'c2929d0c-5a78-54c0-9e60-e4f901d6e896': 'catches',
    'c2929d0c-5a78-54c0-4d63-7ae501d6e895': 'perfect_catches',
    'c2929d0c-5a78-54c0-a58e-182801d6e895': 'charged_catches',
    
    // Assist Stats
    'c2929d0c-5ac8-54c0-2cf7-cce101d6e827': 'assists',
    'c2929d0c-5a78-54c0-ff3f-687e01d6e895': 'quick_assists',
    
    // Other Stats
    'c2929d0c-3830-54c0-96e1-09e901d6772e': 'ball_distance',
    'c2929d0c-3830-54c0-f62f-b3e901d67734': 'total_xp',
    'c2929d0c-5a78-54c0-e30d-506201d6e897': 'ballform_kos',
    'c2929d0c-5a78-54c0-46a2-255001d6e896': 'frenzy_kos',
};

// ============================================================================
// INTERFACES
// ============================================================================

interface PlayerStats {
    wins: number;
    mvps: number;
    total_games_played: number;
    current_mmr: number;
    win_streak: number;
}

interface DetailedStats {
    total_kos: number;
    raw_kos: number;
    special_kos: number;
    double_kos: number;
    triple_kos: number;
    ultimate_kos: number;
    death_from_above: number;
    ko_streaks: number;
    passes: number;
    curve_passes: number;
    lob_passes: number;
    catches: number;
    perfect_catches: number;
    charged_catches: number;
    assists: number;
    quick_assists: number;
    ball_distance: number;
    ballform_kos: number;
    frenzy_kos: number;
    total_xp: number;
}

interface CachedPlayer {
    stats: PlayerStats;
    detailedStats: DetailedStats;
    odinalId: string;
    username: string;
    publisherUsername: string;
    playlistGuid: string;
    matchFlow: number;
    lastSeen: Date;
}

// ============================================================================
// STATS WATCHER CLASS
// ============================================================================

export class StatsWatcher {
    private config: StatsWatcherConfig;
    private gamePrisma: PrismaClient | null = null;
    private playerCache: Map<string, CachedPlayer> = new Map();
    private pollInterval: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;
    private trophyWebhook: TrophyWebhook | null;
    private metarenaWebhook: MetArenaWebhook | null;
    private trainingGoalsWebhook: TrainingGoalsWebhook | null;
    private engagementTracker: EngagementTracker | null;
    private privateMatchTracker: PrivateMatchTracker | null = null;
    
    // Match debouncer to prevent duplicates
    private matchDebouncer: MatchDebouncer;

    constructor(
        config: StatsWatcherConfig,
        trophyWebhook: TrophyWebhook | null = null,
        metarenaWebhook: MetArenaWebhook | null = null,
        trainingGoalsWebhook: TrainingGoalsWebhook | null = null,
        engagementTracker: EngagementTracker | null = null
    ) {
        this.config = config;
        this.trophyWebhook = trophyWebhook;
        this.metarenaWebhook = metarenaWebhook;
        this.trainingGoalsWebhook = trainingGoalsWebhook;
        this.engagementTracker = engagementTracker;
        
        // Initialize debouncer with 5 second cooldown
        this.matchDebouncer = new MatchDebouncer(5000);
    }

    async start(): Promise<boolean> {
        if (!this.config.enabled) {
            log.info('[StatsWatcher] Disabled in config');
            return false;
        }

        if (this.isRunning) {
            log.warn('[StatsWatcher] Already running');
            return true;
        }

        log.info('[StatsWatcher] Starting Enhanced Stats Watcher...');
        log.info(`[StatsWatcher] Game DB: ${this.config.gameDbUrl.replace(/:[^:@]+@/, ':****@')}`);
        log.info(`[StatsWatcher] Poll interval: ${this.config.pollIntervalMs}ms`);
        log.info(`[StatsWatcher] Trophy webhook: ${this.trophyWebhook ? 'enabled' : 'disabled'}`);
        log.info(`[StatsWatcher] MetArena webhook: ${this.metarenaWebhook ? 'enabled' : 'disabled'}`);
        log.info(`[StatsWatcher] Training Goals: ${this.trainingGoalsWebhook ? 'enabled' : 'disabled'}`);
        log.info(`[StatsWatcher] Engagement Tracker: ${this.engagementTracker ? 'enabled' : 'disabled'}`);
        log.info(`[StatsWatcher] Debounce: enabled (5000ms cooldown)`);
        log.info(`[StatsWatcher] Tracking ${Object.keys(CONTRACT_STAT_MAPPINGS).length} KPI metrics`);

        try {
            this.gamePrisma = new PrismaClient({
                datasources: {
                    db: { url: this.config.gameDbUrl }
                }
            });
            await this.gamePrisma.$connect();
            log.info('[StatsWatcher] Connected to game database');
        } catch (error: any) {
            log.err(`[StatsWatcher] Failed to connect to game database: ${error.message}`);
            return false;
        }

        await this.populateCache();

        if (this.gamePrisma) {
            this.privateMatchTracker = new PrivateMatchTracker(this.gamePrisma);
            await this.privateMatchTracker.start();
        }

        this.pollInterval = setInterval(() => {
            this.checkForStatChanges();
        }, this.config.pollIntervalMs);

        this.isRunning = true;
        log.info(`[StatsWatcher] Running. Tracking ${this.playerCache.size} player records`);
        return true;
    }

    async stop(): Promise<void> {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        if (this.privateMatchTracker) {
            await this.privateMatchTracker.stop();
        }
        if (this.gamePrisma) {
            await this.gamePrisma.$disconnect();
            this.gamePrisma = null;
        }
        this.isRunning = false;
        log.info('[StatsWatcher] Stopped');
    }

    private async getDetailedStats(userId: number): Promise<DetailedStats> {
        const defaultStats: DetailedStats = {
            total_kos: 0, raw_kos: 0, special_kos: 0,
            double_kos: 0, triple_kos: 0, ultimate_kos: 0,
            death_from_above: 0, ko_streaks: 0,
            passes: 0, curve_passes: 0, lob_passes: 0,
            catches: 0, perfect_catches: 0, charged_catches: 0,
            assists: 0, quick_assists: 0,
            ball_distance: 0, ballform_kos: 0, frenzy_kos: 0, total_xp: 0
        };

        if (!this.gamePrisma) return defaultStats;

        try {
            const numerators = await this.gamePrisma.$queryRaw<Array<{guid: string, numerator: number}>>`
                SELECT guid::text, numerator 
                FROM contract_numerators 
                WHERE user_id = ${userId} AND numerator > 0
            `;

            for (const row of numerators) {
                const statName = CONTRACT_STAT_MAPPINGS[row.guid];
                if (statName && statName in defaultStats) {
                    (defaultStats as any)[statName] = row.numerator;
                }
            }
        } catch (error: any) {
            log.err(`[StatsWatcher] Failed to get detailed stats: ${error.message}`);
        }

        return defaultStats;
    }

    private async populateCache(): Promise<void> {
        if (!this.gamePrisma) return;

        try {
            const skills = await this.gamePrisma.skill.findMany({
                include: {
                    users: {
                        select: { id: true, username: true, publisher_username: true }
                    }
                }
            });

            for (const skill of skills) {
                const cacheKey = `${skill.user_id}-${skill.playlist_guid}-${skill.match_flow}`;
                const detailedStats = await this.getDetailedStats(Number(skill.user_id));
                
                this.playerCache.set(cacheKey, {
                    stats: {
                        wins: skill.wins || 0,
                        mvps: skill.mvps || 0,
                        total_games_played: skill.total_games_played || 0,
                        current_mmr: skill.current_mmr || 2500,
                        win_streak: skill.win_streak || 0
                    },
                    detailedStats,
                    odinalId: skill.user_id.toString(),
                    username: skill.users.username,
                    publisherUsername: skill.users.publisher_username,
                    playlistGuid: skill.playlist_guid,
                    matchFlow: skill.match_flow,
                    lastSeen: new Date()
                });
            }
            
            log.info(`[StatsWatcher] Cache populated with ${this.playerCache.size} players`);
        } catch (error: any) {
            log.err(`[StatsWatcher] Failed to populate cache: ${error.message}`);
        }
    }

    // ========================================================================
    // STAT CHANGE DETECTION - WITH DEBOUNCE
    // ========================================================================

    private async checkForStatChanges(): Promise<void> {
        if (!this.gamePrisma) return;

        try {
            const skills = await this.gamePrisma.skill.findMany({
                include: {
                    users: {
                        select: { id: true, username: true, publisher_username: true }
                    }
                }
            });

            for (const skill of skills) {
                const cacheKey = `${skill.user_id}-${skill.playlist_guid}-${skill.match_flow}`;
                
                const currentStats: PlayerStats = {
                    wins: skill.wins || 0,
                    mvps: skill.mvps || 0,
                    total_games_played: skill.total_games_played || 0,
                    current_mmr: skill.current_mmr || 2500,
                    win_streak: skill.win_streak || 0
                };

                const cached = this.playerCache.get(cacheKey);
                
                // Match completed - games played increased
                if (cached && currentStats.total_games_played > cached.stats.total_games_played) {
                    const currentDetailedStats = await this.getDetailedStats(Number(skill.user_id));
                    
                    // Calculate KPIs for debounce check
                    const matchKPIs = {
                        kos: currentDetailedStats.total_kos - cached.detailedStats.total_kos,
                        assists: currentDetailedStats.assists - cached.detailedStats.assists,
                        catches: currentDetailedStats.catches - cached.detailedStats.catches,
                        passes: currentDetailedStats.passes - cached.detailedStats.passes,
                        double_kos: currentDetailedStats.double_kos - cached.detailedStats.double_kos,
                        triple_kos: currentDetailedStats.triple_kos - cached.detailedStats.triple_kos,
                    };
                    
                    // *** DEBOUNCE CHECK ***
                    // Skip webhooks if this is a duplicate event within cooldown window
                    if (this.matchDebouncer.isDuplicate(
                        cached.username, 
                        matchKPIs, 
                        currentStats.total_games_played
                    )) {
                        // Still update cache to prevent re-detection, but skip webhooks
                        this.playerCache.set(cacheKey, {
                            stats: currentStats,
                            detailedStats: currentDetailedStats,
                            odinalId: skill.user_id.toString(),
                            username: skill.users.username,
                            publisherUsername: skill.users.publisher_username,
                            playlistGuid: skill.playlist_guid,
                            matchFlow: skill.match_flow,
                            lastSeen: new Date()
                        });
                        continue; // Skip to next player
                    }
                    
                    // Not a duplicate - process the match
                    await this.onMatchCompleted(cached, currentStats, currentDetailedStats, skill.playlist_guid);
                    
                    // Update cache
                    this.playerCache.set(cacheKey, {
                        stats: currentStats,
                        detailedStats: currentDetailedStats,
                        odinalId: skill.user_id.toString(),
                        username: skill.users.username,
                        publisherUsername: skill.users.publisher_username,
                        playlistGuid: skill.playlist_guid,
                        matchFlow: skill.match_flow,
                        lastSeen: new Date()
                    });
                } else if (!cached) {
                    // New player - add to cache
                    const detailedStats = await this.getDetailedStats(Number(skill.user_id));
                    this.playerCache.set(cacheKey, {
                        stats: currentStats,
                        detailedStats,
                        odinalId: skill.user_id.toString(),
                        username: skill.users.username,
                        publisherUsername: skill.users.publisher_username,
                        playlistGuid: skill.playlist_guid,
                        matchFlow: skill.match_flow,
                        lastSeen: new Date()
                    });
                }
            }
        } catch (error: any) {
            log.err(`[StatsWatcher] Poll error: ${error.message}`);
        }
    }

    private async onMatchCompleted(
        cached: CachedPlayer, 
        current: PlayerStats, 
        currentDetailed: DetailedStats,
        playlistGuid: string
    ): Promise<void> {
        const winsGained = current.wins - cached.stats.wins;
        const mvpsGained = current.mvps - cached.stats.mvps;
        const mmrChange = current.current_mmr - cached.stats.current_mmr;
        const won = winsGained > 0;

        const matchKPIs = {
            kos: currentDetailed.total_kos - cached.detailedStats.total_kos,
            raw_kos: currentDetailed.raw_kos - cached.detailedStats.raw_kos,
            special_kos: currentDetailed.special_kos - cached.detailedStats.special_kos,
            double_kos: currentDetailed.double_kos - cached.detailedStats.double_kos,
            triple_kos: currentDetailed.triple_kos - cached.detailedStats.triple_kos,
            ultimate_kos: currentDetailed.ultimate_kos - cached.detailedStats.ultimate_kos,
            death_from_above: currentDetailed.death_from_above - cached.detailedStats.death_from_above,
            passes: currentDetailed.passes - cached.detailedStats.passes,
            curve_passes: currentDetailed.curve_passes - cached.detailedStats.curve_passes,
            lob_passes: currentDetailed.lob_passes - cached.detailedStats.lob_passes,
            catches: currentDetailed.catches - cached.detailedStats.catches,
            perfect_catches: currentDetailed.perfect_catches - cached.detailedStats.perfect_catches,
            assists: currentDetailed.assists - cached.detailedStats.assists,
            ballform_kos: currentDetailed.ballform_kos - cached.detailedStats.ballform_kos,
            frenzy_kos: currentDetailed.frenzy_kos - cached.detailedStats.frenzy_kos,
        };

        log.info(`[StatsWatcher] ========================================`);
        log.info(`[StatsWatcher] MATCH COMPLETED: ${cached.username}`);
        log.info(`[StatsWatcher] Result: ${won ? 'WIN' : 'LOSS'}`);
        log.info(`[StatsWatcher] MVP: ${mvpsGained > 0 ? 'YES' : 'NO'}`);
        log.info(`[StatsWatcher] MMR: ${mmrChange >= 0 ? '+' : ''}${mmrChange} (${current.current_mmr})`);
        log.info(`[StatsWatcher] Win Streak: ${current.win_streak}`);
        log.info(`[StatsWatcher] --- MATCH KPIs ---`);
        log.info(`[StatsWatcher] KOs: ${matchKPIs.kos} (Raw: ${matchKPIs.raw_kos}, Special: ${matchKPIs.special_kos})`);
        log.info(`[StatsWatcher] Multi-KOs: Double=${matchKPIs.double_kos}, Triple=${matchKPIs.triple_kos}, Ultimate=${matchKPIs.ultimate_kos}`);
        log.info(`[StatsWatcher] Passes: ${matchKPIs.passes} (Curve: ${matchKPIs.curve_passes}, Lob: ${matchKPIs.lob_passes})`);
        log.info(`[StatsWatcher] Catches: ${matchKPIs.catches} (Perfect: ${matchKPIs.perfect_catches})`);
        log.info(`[StatsWatcher] Assists: ${matchKPIs.assists}`);
        log.info(`[StatsWatcher] ========================================`);

        const matchData = {
            odinalId: cached.odinalId,
            username: cached.username,
            won,
            isMvp: mvpsGained > 0,
            mmrChange,
            newMmr: current.current_mmr,
            winStreak: current.win_streak,
            playlistGuid,
            kpis: matchKPIs,
            cumulativeStats: {
                total_games: current.total_games_played,
                total_wins: current.wins,
                total_mvps: current.mvps,
                total_kos: currentDetailed.total_kos,
                total_passes: currentDetailed.passes,
                total_catches: currentDetailed.catches,
                total_assists: currentDetailed.assists,
            }
        };

        if (this.trophyWebhook) {
            await this.trophyWebhook.sendMatchComplete(matchData);
        }

        if (this.metarenaWebhook) {
            await this.metarenaWebhook.sendMatchComplete(matchData);
        }

        if (this.trainingGoalsWebhook) {
            await this.trainingGoalsWebhook.processMatchComplete(matchData);
        }

        // NEW: Track engagement for pledge signer scoring
        if (this.engagementTracker) {
            await this.engagementTracker.onMatchCompleted(
                cached.username,
                cached.publisherUsername,
                won,
                mvpsGained > 0,
                current.win_streak,
                matchKPIs
            );
        }

        await this.checkAchievements(cached, current, currentDetailed);
    }

    private async checkAchievements(
        cached: CachedPlayer, 
        current: PlayerStats,
        currentDetailed: DetailedStats
    ): Promise<void> {
        const prev = cached.stats;
        const prevDetailed = cached.detailedStats;
        const achievements: Array<{id: string; name: string; description: string}> = [];

        if (prev.total_games_played === 0 && current.total_games_played >= 1) {
            achievements.push({ id: 'first_game', name: 'Welcome to the Streets', description: 'Play your first match' });
        }
        if (prev.wins === 0 && current.wins >= 1) {
            achievements.push({ id: 'first_win', name: 'First Victory', description: 'Win your first match' });
        }
        for (const m of [10, 25, 50, 100, 250, 500, 1000]) {
            if (prev.wins < m && current.wins >= m) {
                achievements.push({ id: `wins_${m}`, name: `${m} Wins`, description: `Win ${m} matches` });
            }
        }

        for (const m of [1, 10, 25, 50, 100]) {
            if (prev.mvps < m && current.mvps >= m) {
                achievements.push({ id: `mvps_${m}`, name: m === 1 ? 'First MVP' : `${m} MVPs`, description: m === 1 ? 'Earn your first MVP' : `Earn ${m} MVP awards` });
            }
        }

        for (const m of [3, 5, 10, 20]) {
            if (prev.win_streak < m && current.win_streak >= m) {
                achievements.push({ id: `streak_${m}`, name: `${m} Win Streak`, description: `Win ${m} matches in a row` });
            }
        }

        for (const m of [3000, 3500, 4000, 4500, 5000]) {
            if (prev.current_mmr < m && current.current_mmr >= m) {
                achievements.push({ id: `mmr_${m}`, name: `${m} MMR`, description: `Reach ${m} MMR` });
            }
        }

        for (const m of [100, 500, 1000, 5000, 10000]) {
            if (prevDetailed.total_kos < m && currentDetailed.total_kos >= m) {
                achievements.push({ id: `kos_${m}`, name: `${m} Total KOs`, description: `Get ${m} total knockouts` });
            }
        }

        for (const m of [100, 500, 1000]) {
            if (prevDetailed.passes < m && currentDetailed.passes >= m) {
                achievements.push({ id: `passes_${m}`, name: `${m} Passes`, description: `Complete ${m} passes` });
            }
        }

        for (const m of [50, 100, 500]) {
            if (prevDetailed.catches < m && currentDetailed.catches >= m) {
                achievements.push({ id: `catches_${m}`, name: `${m} Catches`, description: `Make ${m} catches` });
            }
        }

        for (const m of [50, 100, 500]) {
            if (prevDetailed.assists < m && currentDetailed.assists >= m) {
                achievements.push({ id: `assists_${m}`, name: `${m} Assists`, description: `Get ${m} assists` });
            }
        }

        for (const achievement of achievements) {
            log.info(`[StatsWatcher] 🏆 ACHIEVEMENT: ${cached.username} - ${achievement.name}`);
            
            if (this.trophyWebhook) {
                await this.trophyWebhook.sendAchievement({
                    odinalId: cached.odinalId,
                    username: cached.username,
                    achievementId: achievement.id,
                    achievementName: achievement.name,
                    achievementDescription: achievement.description
                });
            }

            if (this.metarenaWebhook) {
                await this.metarenaWebhook.sendAchievement({
                    odinalId: cached.odinalId,
                    username: cached.username,
                    achievementId: achievement.id,
                    achievementName: achievement.name,
                    achievementDescription: achievement.description
                });
            }

            // NEW: Track achievement for engagement scoring
            if (this.engagementTracker) {
                await this.engagementTracker.onAchievementEarned(
                    cached.username,
                    cached.publisherUsername,
                    achievement.id,
                    achievement.name
                );
            }
        }
    }

    getStatus(): { running: boolean; playerCount: number; metricsTracked: number; debounceStats: any } {
        return {
            running: this.isRunning,
            playerCount: this.playerCache.size,
            metricsTracked: Object.keys(CONTRACT_STAT_MAPPINGS).length,
            debounceStats: this.matchDebouncer.getStats()
        };
    }
}

export default StatsWatcher;
