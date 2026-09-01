// ============================================================================
// AUTHPROXY - TRAINING GOALS WEBHOOK MODULE
// Tracks match completions in Trophy Supabase for achievement sponsorships
// Updated with full training goals system: templates, XP tracking, event logging
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Logger from './logger';
import { EngagementTracker } from './engagement-tracker';

const log = new Logger();

export interface TrainingGoalsConfig {
    enabled: boolean;
    supabaseUrl: string;
    supabaseServiceKey: string;
}

interface MatchData {
    odinalId: string;
    username: string;
    publisherUsername?: string;
    won: boolean;
    isMvp: boolean;
    kpis: {
        kos?: number;
        assists?: number;
        passes?: number;
        catches?: number;
        [key: string]: number | undefined;
    };
}

interface TrainingGoalTemplate {
    id: string;
    name: string;
    description: string;
    game_slug: string;
    xp_reward: number;
    steps: Array<{
        event_type: string;
        target_value: number;
        description: string;
    }>;
}

interface PlayerProgress {
    user_id: string;
    goal_id: string;
    progress: Record<string, number>;
    completed: boolean;
    completed_at: string | null;
}

export class TrainingGoalsWebhook {
    private config: TrainingGoalsConfig;
    private supabase: SupabaseClient | null = null;
    private engagementTracker: EngagementTracker | null;
    private templates: TrainingGoalTemplate[] = [];
    private templatesLoaded: boolean = false;

    constructor(config: TrainingGoalsConfig, engagementTracker: EngagementTracker | null = null) {
        this.config = config;
        this.engagementTracker = engagementTracker;

        if (config.enabled) {
            if (!config.supabaseUrl || !config.supabaseServiceKey) {
                log.err('[TrainingGoals] Missing Supabase credentials');
                return;
            }

            this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            });

            log.info('[TrainingGoals] Webhook enabled');
            log.info(`[TrainingGoals] Supabase: ${config.supabaseUrl}`);
            
            // Load templates on startup
            this.loadTemplates().catch(err => {
                log.err(`[TrainingGoals] Failed to load templates: ${err.message}`);
            });
        }
    }

    /**
     * Load all training goal templates from database
     */
    private async loadTemplates(): Promise<void> {
        if (!this.supabase) return;

        try {
            const { data, error } = await this.supabase
                .from('training_goal_templates')
                .select('*')
                .eq('game_slug', 'knockout_city');

            if (error) {
                log.err(`[TrainingGoals] Error loading templates: ${error.message}`);
                return;
            }

            this.templates = data || [];
            this.templatesLoaded = true;
            log.info(`[TrainingGoals] Loaded ${this.templates.length} training goal templates`);
        } catch (error: any) {
            log.err(`[TrainingGoals] Exception loading templates: ${error.message}`);
        }
    }

    async processMatchComplete(matchData: MatchData): Promise<void> {
        const { odinalId, username, publisherUsername, won, isMvp, kpis } = matchData;

        if (!this.config.enabled || !this.supabase) {
            return;
        }

        log.info(`[TrainingGoals] Processing match for ${username}`);

        try {
            // Reload templates if not loaded yet
            if (!this.templatesLoaded) {
                await this.loadTemplates();
            }

            // ================================================================
            // AUTO-PROVISIONING: Create player record if it doesn't exist
            // ================================================================

            let playerRecord = null;

            // Try to look up existing player
            const { data: existingPlayer, error: lookupError } = await this.supabase
                .from('kocity_player_stats')
                .select('*')
                .eq('identifier', odinalId)
                .single();

            if (lookupError) {
                // Check if it's a "not found" error (PGRST116)
                if (lookupError.code === 'PGRST116' || lookupError.message?.includes('not found')) {
                    log.info(`[TrainingGoals] 🆕 Player ${username} not found. Auto-creating Trophy account...`);

                    // Create new player record matching Trophy schema
                    const { data: newPlayer, error: createError } = await this.supabase
                        .from('kocity_player_stats')
                        .insert({
                            identifier: odinalId,
                            display_name: username,
                            matches_played: 0,
                            matches_won: 0,
                            total_knockouts: 0,
                            total_deaths: 0,
                            total_assists: 0,
                            total_score: 0,
                            perfect_games: 0,
                            comebacks: 0,
                            current_win_streak: 0,
                            best_win_streak: 0,
                            total_playtime_seconds: 0,
                            total_playtime_hours: 0,
                            tournaments_participated: 0,
                            tournaments_won: 0,
                            last_seen_at: new Date().toISOString(),
                            last_server_id: 'gcp-us-central1',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .select()
                        .single();

                    if (createError) {
                        log.err(`[TrainingGoals] ❌ Failed to create player record: ${createError.message}`);
                        log.err(`[TrainingGoals] Error code: ${createError.code}`);
                        // Continue with default values
                        playerRecord = {
                            identifier: odinalId,
                            display_name: username,
                            matches_played: 0,
                            matches_won: 0,
                            total_knockouts: 0,
                            total_assists: 0,
                            current_win_streak: 0,
                            best_win_streak: 0
                        };
                    } else {
                        log.info(`[TrainingGoals] ✅ Trophy account created for ${username}`);
                        playerRecord = newPlayer;
                    }
                } else if (lookupError.code === '401' || lookupError.message?.includes('401')) {
                    log.err('[TrainingGoals] ❌ Authentication error (401)');
                    log.err(`[TrainingGoals] Supabase URL: ${this.config.supabaseUrl}`);
                    log.err(`[TrainingGoals] Service key present: ${this.config.supabaseServiceKey ? 'Yes (starts with ' + this.config.supabaseServiceKey.substring(0, 10) + '...)' : 'No'}`);
                    log.err(`[TrainingGoals] Error details: ${lookupError.message}`);
                    return; // Can't proceed without valid credentials
                } else {
                    log.err(`[TrainingGoals] ❌ Unexpected error looking up player: ${lookupError.message}`);
                    log.err(`[TrainingGoals] Error code: ${lookupError.code}`);
                    return;
                }
            } else {
                playerRecord = existingPlayer;
                log.info(`[TrainingGoals] ✅ Found existing player: ${username}`);
            }

            // ================================================================
            // Update player stats (matching Trophy schema)
            // ================================================================

            const updatedStats = {
                identifier: odinalId,
                display_name: username,
                matches_played: (playerRecord.matches_played || 0) + 1,
                matches_won: (playerRecord.matches_won || 0) + (won ? 1 : 0),
                total_knockouts: (playerRecord.total_knockouts || 0) + (kpis.kos || 0),
                total_assists: (playerRecord.total_assists || 0) + (kpis.assists || 0),
                current_win_streak: won ? (playerRecord.current_win_streak || 0) + 1 : 0,
                best_win_streak: Math.max(
                    playerRecord.best_win_streak || 0,
                    won ? (playerRecord.current_win_streak || 0) + 1 : 0
                ),
                last_seen_at: new Date().toISOString(),
                last_server_id: 'gcp-us-central1',
                updated_at: new Date().toISOString()
            };

            const { error: updateError } = await this.supabase
                .from('kocity_player_stats')
                .upsert(updatedStats, { onConflict: 'identifier' });

            if (updateError) {
                log.err(`[TrainingGoals] ❌ Error updating stats: ${updateError.message}`);
                log.err(`[TrainingGoals] Error code: ${updateError.code}`);
            } else {
                log.info(`[TrainingGoals] ✅ Stats updated for ${username}`);
                log.info(`[TrainingGoals]    Matches: ${updatedStats.matches_played}, Wins: ${updatedStats.matches_won}, KOs: ${updatedStats.total_knockouts}`);
            }

            // ================================================================
            // Check training goals progress
            // ================================================================

            await this.checkTrainingGoals(odinalId, username, updatedStats, kpis, won, isMvp);

        } catch (error: any) {
            log.err(`[TrainingGoals] ❌ Unexpected error in processMatchComplete: ${error.message}`);
            if (error.stack) {
                log.err(`[TrainingGoals] Stack trace: ${error.stack}`);
            }
        }
    }

    /**
     * Check all training goals and award XP for completed ones
     */
    private async checkTrainingGoals(
        odinalId: string,
        username: string,
        stats: any,
        kpis: any,
        won: boolean,
        isMvp: boolean
    ): Promise<void> {
        if (!this.supabase || this.templates.length === 0) {
            return;
        }

        log.info(`[TrainingGoals] Checking ${this.templates.length} training goals for ${username}`);

        // Build current match events for checking
        const matchEvents: Record<string, number> = {
            'match_complete': 1,
            'match_win': won ? 1 : 0,
            'match_mvp': isMvp ? 1 : 0,
            'knockout': kpis.kos || 0,
            'assist': kpis.assists || 0,
            'pass': kpis.passes || 0,
            'catch': kpis.catches || 0,
            // Add cumulative stats
            'total_wins': stats.matches_won || 0,
            'total_knockouts': stats.total_knockouts || 0,
            'total_assists': stats.total_assists || 0,
            'win_streak': stats.current_win_streak || 0
        };

        let totalXpAwarded = 0;

        for (const template of this.templates) {
            try {
                // Check each step in the goal
                let goalCompleted = true;

                for (const step of template.steps) {
                    const eventType = step.event_type;
                    const targetValue = step.target_value;
                    const currentValue = matchEvents[eventType] || 0;

                    // Check if this step is met
                    if (currentValue < targetValue) {
                        goalCompleted = false;
                        break;
                    }
                }

                // If goal completed, award XP
                if (goalCompleted) {
                    log.info(`[TrainingGoals] 🎯 ${username} completed: ${template.name} (+${template.xp_reward} XP)`);
                    totalXpAwarded += template.xp_reward;

                    // Log training event
                    const { error: eventError } = await this.supabase
                        .from('training_events')
                        .insert({
                            gamertag: username,
                            game_slug: 'knockout_city',
                            event_type: 'goal_completed',
                            event_data: {
                                goal_id: template.id,
                                goal_name: template.name,
                                xp_awarded: template.xp_reward
                            },
                            event_timestamp: new Date().toISOString()
                        });

                    if (eventError) {
                        log.err(`[TrainingGoals] Error logging event: ${eventError.message}`);
                    }

                    // Fire engagement tracker event
                    if (this.engagementTracker) {
                        this.engagementTracker.onTrainingGoalCompleted(
                            username,
                            template.name,
                            template.xp_reward
                        ).catch(() => {});
                    }
                }

            } catch (error: any) {
                log.err(`[TrainingGoals] Error processing goal ${template.name}: ${error.message}`);
            }
        }

        // Update player XP totals if any XP was awarded
        if (totalXpAwarded > 0) {
            await this.updatePlayerXP(odinalId, totalXpAwarded);
        }
    }

    /**
     * Update player's total XP and level
     */
    private async updatePlayerXP(playerId: string, xpAmount: number): Promise<void> {
        if (!this.supabase) return;

        try {
            // Get current XP
            const { data: xpData, error: xpError } = await this.supabase
                .from('player_training_xp')
                .select('*')
                .eq('player_id', playerId)
                .single();

            let newXP = xpAmount;
            let newLevel = 1;
            let goalsCompleted = 1;

            if (!xpError && xpData) {
                // Update existing record
                newXP = (xpData.total_xp || 0) + xpAmount;
                goalsCompleted = (xpData.goals_completed || 0) + 1;
            }

            // Calculate level (every 1000 XP = 1 level)
            newLevel = Math.floor(newXP / 1000) + 1;

            // Upsert player XP
            const { error: upsertError } = await this.supabase
                .from('player_training_xp')
                .upsert({
                    player_id: playerId,
                    trophy_player_id: 15, // Marcus's Trophy player ID
                    total_xp: newXP,
                    level: newLevel,
                    goals_completed: goalsCompleted,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'player_id'
                });

            if (upsertError) {
                log.err(`[TrainingGoals] Error updating XP: ${upsertError.message}`);
            } else {
                log.info(`[TrainingGoals] ✅ Updated XP: ${newXP} (Level ${newLevel})`);
            }

        } catch (error: any) {
            log.err(`[TrainingGoals] Error in updatePlayerXP: ${error.message}`);
        }
    }

    getStatus(): { enabled: boolean; connected: boolean; templatesLoaded: number } {
        return {
            enabled: this.config.enabled,
            connected: this.supabase !== null,
            templatesLoaded: this.templates.length
        };
    }
}

export default TrainingGoalsWebhook;
