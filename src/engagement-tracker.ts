// ============================================================================
// AUTHPROXY - ENGAGEMENT TRACKER MODULE
// Fires engagement events to MetArena API for pledge signer tracking
// Links game activity back to professional pledge signers so Marcus can
// identify warm leads (executives who actually play)
// ============================================================================

import axios from 'axios';
import Logger from './logger';

const log = new Logger();

export interface EngagementConfig {
    enabled: boolean;
    apiUrl: string;       // MetArena API base URL (e.g. https://metarena-api.vercel.app)
    apiSecret: string;    // Shared secret for server-to-server auth
}

// Score weights (mirrored from engagement-endpoints.js for logging)
const SCORE_MAP: Record<string, number> = {
    ko_city_first_connect: 5,
    ko_city_session: 5,
    match_completed: 5,
    match_won: 2,       // bonus on top of match_completed
    match_mvp: 3,       // bonus on top of match_completed
    achievement_earned: 4,
    training_goal_completed: 4,
    win_streak_3: 2,
    win_streak_5: 3,
    win_streak_10: 5,
};

export class EngagementTracker {
    private config: EngagementConfig;
    private connectedPlayers: Set<string> = new Set(); // track who's connected this session

    constructor(config: EngagementConfig) {
        this.config = config;
        if (config.enabled) {
            log.info('[Engagement] Tracker enabled');
            log.info(`[Engagement] API: ${config.apiUrl}`);
        }
    }

    // ========================================================================
    // FIRE AND FORGET - All tracking calls are non-blocking
    // ========================================================================

    private async track(
        gameUsername: string,
        eventType: string,
        eventCategory: string,
        eventDetail: Record<string, any> = {}
    ): Promise<void> {
        if (!this.config.enabled) return;

        try {
            await axios.post(
                `${this.config.apiUrl}/api/engagement/track`,
                {
                    gameUsername,
                    eventType,
                    eventCategory,
                    eventDetail,
                    source: 'authproxy'
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Server-Secret': this.config.apiSecret,
                        'User-Agent': 'KOCity-AuthProxy/1.0'
                    },
                    timeout: 5000
                }
            );
            log.debug(`[Engagement] Tracked ${eventType} for ${gameUsername}`);
        } catch (error: any) {
            // Fire and forget - don't let engagement tracking failures affect gameplay
            log.debug(`[Engagement] Failed to track ${eventType}: ${error.message}`);
        }
    }

    // ========================================================================
    // PLAYER CONNECTION EVENTS
    // Called from index.ts when a player authenticates
    // ========================================================================

    async onPlayerConnected(username: string, publisherUsername: string): Promise<void> {
        const name = publisherUsername || username;

        if (!this.connectedPlayers.has(name)) {
            this.connectedPlayers.add(name);
            await this.track(name, 'ko_city_first_connect', 'game', {
                username,
                publisherUsername,
                connectedAt: new Date().toISOString()
            });
        } else {
            await this.track(name, 'ko_city_session', 'game', {
                username,
                connectedAt: new Date().toISOString()
            });
        }
    }

    // ========================================================================
    // MATCH COMPLETION EVENTS
    // Called from stats-watcher.ts after onMatchCompleted
    // ========================================================================

    async onMatchCompleted(
        username: string,
        publisherUsername: string,
        won: boolean,
        isMvp: boolean,
        winStreak: number,
        kpis: Record<string, number>
    ): Promise<void> {
        const name = publisherUsername || username;

        // Base match event
        await this.track(name, 'match_completed', 'game', {
            won,
            isMvp,
            winStreak,
            kos: kpis.kos || 0,
            assists: kpis.assists || 0,
            catches: kpis.catches || 0
        });

        // Bonus events for wins and MVPs
        if (won) {
            await this.track(name, 'match_won', 'game', { winStreak });
        }
        if (isMvp) {
            await this.track(name, 'match_mvp', 'game');
        }

        // Win streak milestones
        if (winStreak === 3) {
            await this.track(name, 'win_streak_3', 'game');
        } else if (winStreak === 5) {
            await this.track(name, 'win_streak_5', 'game');
        } else if (winStreak === 10) {
            await this.track(name, 'win_streak_10', 'game');
        }
    }

    // ========================================================================
    // ACHIEVEMENT EVENTS
    // Called from stats-watcher.ts after checkAchievements
    // ========================================================================

    async onAchievementEarned(
        username: string,
        publisherUsername: string,
        achievementId: string,
        achievementName: string
    ): Promise<void> {
        const name = publisherUsername || username;
        await this.track(name, 'achievement_earned', 'trophy', {
            achievementId,
            achievementName
        });
    }

    // ========================================================================
    // TRAINING GOAL EVENTS
    // Called from webhooks-training.ts after goal completion
    // ========================================================================

    async onTrainingGoalCompleted(
        username: string,
        goalName: string,
        xpAwarded: number
    ): Promise<void> {
        await this.track(username, 'training_goal_completed', 'trophy', {
            goalName,
            xpAwarded
        });
    }

    // ========================================================================
    // STATUS
    // ========================================================================

    getStatus(): { enabled: boolean; connectedPlayers: number } {
        return {
            enabled: this.config.enabled,
            connectedPlayers: this.connectedPlayers.size
        };
    }
}

export default EngagementTracker;
