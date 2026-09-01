-- CreateTable
CREATE TABLE "allowlisted_users" (
    "notes" TEXT,
    "created_at" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "always_allow_login" BOOLEAN NOT NULL DEFAULT false,
    "velan_value_transfer" BOOLEAN NOT NULL DEFAULT false,
    "force_cohort_a" BOOLEAN NOT NULL DEFAULT false,
    "force_cohort_b" BOOLEAN NOT NULL DEFAULT false,
    "content_update" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "allowlisted_users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "backends" (
    "id" BIGSERIAL NOT NULL,
    "active_time" BIGINT NOT NULL DEFAULT date_part('epoch'::text, now()),
    "ordinal" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "backends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "user_id" BIGINT NOT NULL,
    "blocked_user_id" BIGINT NOT NULL,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("user_id","blocked_user_id")
);

-- CreateTable
CREATE TABLE "brawl_pass" (
    "user_id" BIGINT NOT NULL,
    "premium_season" INTEGER,
    "level_season" INTEGER,
    "level" INTEGER,
    "last_rewarded_level" INTEGER NOT NULL DEFAULT 0,
    "last_premium_rewarded_level" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "brawl_pass_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "brawl_pass_rewards" (
    "season" INTEGER NOT NULL,
    "brawl_pass_level" INTEGER NOT NULL,
    "premium_only" BOOLEAN NOT NULL,
    "reward" TEXT,

    CONSTRAINT "brawl_pass_rewards_pkey" PRIMARY KEY ("season","brawl_pass_level")
);

-- CreateTable
CREATE TABLE "commerce_accessories" (
    "item" UUID NOT NULL,
    "is_crew" BOOLEAN,
    "is_consumable" BOOLEAN,
    "ui_name" TEXT,
    "rarity" TEXT,
    "accessory_type" TEXT,
    "platform_restriction" TEXT,

    CONSTRAINT "commerce_accessories_pkey" PRIMARY KEY ("item")
);

-- CreateTable
CREATE TABLE "commerce_codes" (
    "code" VARCHAR NOT NULL,
    "use_limit" INTEGER NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "offer_id" VARCHAR NOT NULL,
    "create_user" VARCHAR NOT NULL,
    "create_timestamp" BIGINT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "commerce_codes_pk" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "commerce_codes_redeemed" (
    "user_id" BIGINT NOT NULL,
    "code" VARCHAR NOT NULL,
    "timestamp" BIGINT NOT NULL,

    CONSTRAINT "commerce_codes_redeemed_pkey" PRIMARY KEY ("user_id","code")
);

-- CreateTable
CREATE TABLE "commerce_crew_inventory_equipped" (
    "crew_guid" UUID NOT NULL,
    "slot" TEXT NOT NULL,
    "content" UUID
);

-- CreateTable
CREATE TABLE "commerce_currencies" (
    "alias" TEXT NOT NULL,
    "premium" BOOLEAN,
    "currency_name" TEXT,

    CONSTRAINT "commerce_currencies_pkey" PRIMARY KEY ("alias")
);

-- CreateTable
CREATE TABLE "commerce_funds" (
    "user_id" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "balance" INTEGER NOT NULL,

    CONSTRAINT "commerce_funds_pkey" PRIMARY KEY ("user_id","currency")
);

-- CreateTable
CREATE TABLE "commerce_funds_expirations" (
    "user_id" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" INTEGER,
    "granted_at" BIGINT NOT NULL,
    "expires_at" BIGINT NOT NULL,

    CONSTRAINT "commerce_funds_expirations_pkey" PRIMARY KEY ("user_id","currency","granted_at")
);

-- CreateTable
CREATE TABLE "commerce_inventory_consumables" (
    "user_id" BIGINT NOT NULL,
    "content" UUID NOT NULL,
    "consumable_quantity" INTEGER NOT NULL,

    CONSTRAINT "commerce_inventory_consumables_pkey" PRIMARY KEY ("user_id","content")
);

-- CreateTable
CREATE TABLE "commerce_inventory_durables" (
    "user_id" BIGINT NOT NULL,
    "content" UUID NOT NULL,
    "is_favorited" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "commerce_inventory_durables_pkey" PRIMARY KEY ("user_id","content")
);

-- CreateTable
CREATE TABLE "commerce_inventory_durables_inactive" (
    "user_id" BIGINT NOT NULL,
    "content" UUID NOT NULL,

    CONSTRAINT "commerce_inventory_durables_inactive_pkey" PRIMARY KEY ("user_id","content")
);

-- CreateTable
CREATE TABLE "commerce_inventory_equipped" (
    "user_id" BIGINT NOT NULL,
    "slot" TEXT NOT NULL,
    "content" UUID,

    CONSTRAINT "commerce_inventory_equipped_pkey" PRIMARY KEY ("user_id","slot")
);

-- CreateTable
CREATE TABLE "commerce_inventory_initial" (
    "contents" UUID NOT NULL,

    CONSTRAINT "commerce_inventory_initial_pkey" PRIMARY KEY ("contents")
);

-- CreateTable
CREATE TABLE "commerce_offer_currencies" (
    "offer" UUID NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "commerce_offer_currencies_pkey" PRIMARY KEY ("offer","currency")
);

-- CreateTable
CREATE TABLE "commerce_offer_item_contents" (
    "offer" UUID NOT NULL,
    "item_index" INTEGER NOT NULL,
    "contents" UUID,

    CONSTRAINT "commerce_offer_item_contents_pkey" PRIMARY KEY ("offer","item_index")
);

-- CreateTable
CREATE TABLE "commerce_offer_items" (
    "offer" UUID NOT NULL,
    "item_index" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "commerce_offer_items_pkey" PRIMARY KEY ("offer","item_index")
);

-- CreateTable
CREATE TABLE "commerce_offers" (
    "offer" UUID NOT NULL,
    "currency" TEXT,
    "full_price" INTEGER NOT NULL,
    "min_price" INTEGER NOT NULL,
    "purchase_limit" INTEGER,

    CONSTRAINT "commerce_offers_pkey" PRIMARY KEY ("offer")
);

-- CreateTable
CREATE TABLE "commerce_offers_purchased_with_limits" (
    "user_id" BIGINT NOT NULL,
    "offer" UUID NOT NULL,
    "quantity" INTEGER,

    CONSTRAINT "commerce_offers_purchased_with_limits_pkey" PRIMARY KEY ("user_id","offer")
);

-- CreateTable
CREATE TABLE "commerce_random_reward_accessories" (
    "reward" UUID NOT NULL,
    "group_index" INTEGER NOT NULL,
    "collection_index" INTEGER NOT NULL,
    "content" UUID NOT NULL,

    CONSTRAINT "commerce_random_reward_accessories_pkey" PRIMARY KEY ("reward","content")
);

-- CreateTable
CREATE TABLE "commerce_random_reward_groups" (
    "reward" UUID NOT NULL,
    "group_index" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "commerce_random_reward_groups_pkey" PRIMARY KEY ("reward","group_index")
);

-- CreateTable
CREATE TABLE "content_update_files" (
    "name" TEXT NOT NULL,
    "value" TEXT,

    CONSTRAINT "content_update_files_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "contract_numerators" (
    "user_id" BIGINT NOT NULL,
    "guid" UUID NOT NULL,
    "platform" INTEGER NOT NULL,
    "numerator" INTEGER,

    CONSTRAINT "contract_numerators_pkey" PRIMARY KEY ("user_id","guid","platform")
);

-- CreateTable
CREATE TABLE "contract_progress" (
    "user_id" BIGINT NOT NULL,
    "contract_guid" UUID NOT NULL,
    "contract_stage" INTEGER NOT NULL,
    "contract_platform" INTEGER NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "contract_progress_pkey" PRIMARY KEY ("user_id","contract_guid","contract_stage","contract_platform")
);

-- CreateTable
CREATE TABLE "contracts" (
    "guid" UUID NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "platform" INTEGER NOT NULL DEFAULT 0,
    "contract_name" TEXT,
    "denominator" INTEGER NOT NULL,
    "can_reset" BOOLEAN NOT NULL DEFAULT false,
    "stage_count" INTEGER NOT NULL DEFAULT 1,
    "reward" TEXT,
    "token" TEXT,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("guid","stage","platform")
);

-- CreateTable
CREATE TABLE "crew_contract_rewards" (
    "contract_guid" UUID NOT NULL,
    "reward" TEXT,

    CONSTRAINT "crew_contract_rewards_pkey" PRIMARY KEY ("contract_guid")
);

-- CreateTable
CREATE TABLE "crew_contracts" (
    "crew_guid" UUID NOT NULL,
    "contract_guid" UUID NOT NULL,
    "completion_progress" INTEGER,
    "completion_criteria" INTEGER NOT NULL,
    "activation_timestamp" BIGINT NOT NULL,
    "lifetime_ms" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "crew_contracts_user_rewards" (
    "user_id" BIGINT NOT NULL,
    "contract_guid" UUID NOT NULL,
    "expiration_timestamp" BIGINT,
    "reward_state" INTEGER,

    CONSTRAINT "crew_contracts_user_rewards_pkey" PRIMARY KEY ("user_id","contract_guid")
);

-- CreateTable
CREATE TABLE "crew_invites" (
    "user_id" BIGINT NOT NULL,
    "sender_id" BIGINT NOT NULL,
    "crew_guid" UUID NOT NULL,
    "sender_persona_kind" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "crew_invites_pkey" PRIMARY KEY ("user_id","sender_id")
);

-- CreateTable
CREATE TABLE "crew_join_requests" (
    "recipient_id" BIGINT NOT NULL,
    "sender_id" BIGINT NOT NULL,
    "crew_guid" UUID NOT NULL,

    CONSTRAINT "crew_join_requests_pkey" PRIMARY KEY ("recipient_id","sender_id")
);

-- CreateTable
CREATE TABLE "crew_members" (
    "user_id" BIGINT NOT NULL,
    "crew_guid" UUID NOT NULL,
    "joined_at" BIGINT NOT NULL,

    CONSTRAINT "crew_members_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "crews" (
    "guid" UUID NOT NULL,
    "captain" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT,
    "name_visible" BOOLEAN DEFAULT true,
    "namer" BIGINT,

    CONSTRAINT "crews_pkey" PRIMARY KEY ("guid")
);

-- CreateTable
CREATE TABLE "data_manifest_changelists" (
    "id" SERIAL NOT NULL,
    "changelist_number" BIGINT NOT NULL,
    "platform_id" INTEGER NOT NULL,

    CONSTRAINT "data_manifest_changelists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_manifest_packages" (
    "id" SERIAL NOT NULL,
    "changelist_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_hash" TEXT NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "mode" TEXT,
    "build" TEXT,
    "build_url" TEXT,
    "release_version" TEXT,
    "content_update_version" TEXT,
    "requires_allowlist" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "data_manifest_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_manifest_platforms" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "data_manifest_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deny_login_period_messages" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,
    "deny_login_period_id" INTEGER NOT NULL,

    CONSTRAINT "deny_login_period_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deny_login_periods" (
    "start_time" BIGINT NOT NULL,
    "end_time" BIGINT NOT NULL,
    "id" SERIAL NOT NULL,

    CONSTRAINT "deny_login_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_images" (
    "image_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "project" TEXT NOT NULL,
    "build_id" INTEGER NOT NULL,
    "account_service_id" INTEGER NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "name" TEXT,
    "network_version" INTEGER,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "broken" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "fleet_images_pkey" PRIMARY KEY ("image_id")
);

-- CreateTable
CREATE TABLE "fleet_profiles" (
    "profile_id" INTEGER NOT NULL,
    "fleet_id" TEXT NOT NULL,
    "fleet_image_id" INTEGER NOT NULL,
    "density" TEXT,

    CONSTRAINT "fleet_profiles_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "friend_requests" (
    "sender_user_id" BIGINT NOT NULL,
    "recipient_user_id" BIGINT NOT NULL,
    "sender_persona_kind" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "friend_requests_pkey" PRIMARY KEY ("sender_user_id","recipient_user_id")
);

-- CreateTable
CREATE TABLE "friends" (
    "user_id" BIGINT NOT NULL,
    "friend_user_id" BIGINT NOT NULL,

    CONSTRAINT "friends_pkey" PRIMARY KEY ("user_id","friend_user_id")
);

-- CreateTable
CREATE TABLE "ftue_breadcrumbs" (
    "user_id" BIGINT NOT NULL,
    "breadcrumb_step" INTEGER,

    CONSTRAINT "ftue_breadcrumbs_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "inactive_locations" (
    "location_id" INTEGER NOT NULL,

    CONSTRAINT "inactive_locations_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "inactive_regions" (
    "region_id" TEXT NOT NULL,

    CONSTRAINT "inactive_regions_pkey" PRIMARY KEY ("region_id")
);

-- CreateTable
CREATE TABLE "join_in_progress_players" (
    "game_server_uuid" TEXT,
    "team_id" INTEGER,
    "timestamp" BIGINT,
    "last_poll_time" BIGINT NOT NULL DEFAULT 0,
    "id" BIGSERIAL NOT NULL,
    "average_mmr" INTEGER NOT NULL DEFAULT 2500,
    "playlist_guid" UUID NOT NULL,
    "region" TEXT NOT NULL,
    "match_flow" INTEGER NOT NULL,
    "client_version" INTEGER NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 0,
    "division" INTEGER NOT NULL DEFAULT 0,
    "platform" TEXT NOT NULL,
    "crossplay_allowed" BOOLEAN NOT NULL,
    "average_sr" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "join_in_progress_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "key_value_pairs" (
    "user_id" BIGINT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "key_value_pairs_pkey" PRIMARY KEY ("user_id","key")
);

-- CreateTable
CREATE TABLE "linear_ftue" (
    "user_id" BIGINT NOT NULL,
    "training_number" INTEGER,
    "training_item_progress_0" INTEGER,
    "training_item_progress_1" INTEGER,
    "training_item_progress_2" INTEGER,
    "training_item_progress_3" INTEGER,
    "step" INTEGER,

    CONSTRAINT "linear_ftue_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "matchmaking" (
    "user_id" BIGINT NOT NULL,
    "start_time" BIGINT,
    "playlist_guid" UUID,
    "match_flow" INTEGER NOT NULL,
    "eligible_for_join_in_progress" BOOLEAN NOT NULL DEFAULT true,
    "group_size" INTEGER NOT NULL DEFAULT 1,
    "mmr" INTEGER,
    "volatility" INTEGER,
    "best_region" TEXT NOT NULL,
    "client_version" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "crossplay" BOOLEAN NOT NULL DEFAULT true,
    "tier" INTEGER,
    "division" INTEGER,
    "request_id" INTEGER NOT NULL DEFAULT 0,
    "games_played" INTEGER NOT NULL DEFAULT 10,
    "pings" TEXT,
    "new_players_count" INTEGER NOT NULL DEFAULT 0,
    "new_player_matchmaking_tier" INTEGER NOT NULL DEFAULT 0,
    "skill_rating" INTEGER NOT NULL DEFAULT 0,
    "manual_region" BOOLEAN,

    CONSTRAINT "matchmaking_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "matchmaking_cooldown" (
    "user_id" BIGINT NOT NULL,
    "utc" INTEGER,

    CONSTRAINT "matchmaking_cooldown_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "matchmaking_parameters" (
    "parameter" INTEGER NOT NULL,
    "time_interval" INTEGER NOT NULL,
    "initial_value" INTEGER NOT NULL,
    "max_value" INTEGER NOT NULL,
    "rate_of_increase" INTEGER NOT NULL,

    CONSTRAINT "matchmaking_parameters_pkey" PRIMARY KEY ("parameter")
);

-- CreateTable
CREATE TABLE "matchmaking_work" (
    "playlist_guid" UUID NOT NULL,
    "match_flow" INTEGER NOT NULL,
    "client_version" INTEGER NOT NULL,
    "backend_id" INTEGER,
    "last_poll_time" BIGINT NOT NULL,

    CONSTRAINT "matchmaking_work_pk" PRIMARY KEY ("playlist_guid","match_flow","client_version")
);

-- CreateTable
CREATE TABLE "new_news" (
    "name" TEXT NOT NULL,
    "start_at" BIGINT,
    "end_at" BIGINT,

    CONSTRAINT "new_news_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "new_news_item_text" (
    "news_name" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "language" TEXT,
    "title" TEXT,
    "message" TEXT,
    "tab_title" TEXT,
    "cta_1" TEXT,
    "cta_2" TEXT,

    CONSTRAINT "new_news_item_text_pkey" PRIMARY KEY ("news_name","item_name")
);

-- CreateTable
CREATE TABLE "new_news_items" (
    "news_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER,
    "platforms" TEXT,
    "tab_type" INTEGER DEFAULT 0,
    "fg_image_index" INTEGER DEFAULT -1,
    "bg_image_index" INTEGER DEFAULT -1,
    "cta_base_color" TEXT,
    "cta_energy_color" TEXT,
    "target_bundle_index" INTEGER DEFAULT -2,

    CONSTRAINT "new_news_items_pkey" PRIMARY KEY ("news_name","name")
);

-- CreateTable
CREATE TABLE "news" (
    "name" TEXT NOT NULL,
    "start_at" BIGINT,
    "end_at" BIGINT,

    CONSTRAINT "news_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "news_item_text" (
    "news_name" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "language" TEXT,
    "title" TEXT,
    "message" TEXT,

    CONSTRAINT "news_item_text_pkey" PRIMARY KEY ("news_name","item_name")
);

-- CreateTable
CREATE TABLE "news_items" (
    "news_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER,
    "slot_0" BOOLEAN DEFAULT true,
    "slot_1" BOOLEAN DEFAULT true,
    "slot_2" BOOLEAN DEFAULT true,
    "platforms" TEXT,
    "image_index" INTEGER,

    CONSTRAINT "news_items_pkey" PRIMARY KEY ("news_name","name")
);

-- CreateTable
CREATE TABLE "ping_data" (
    "user_id" BIGINT NOT NULL,
    "region" TEXT NOT NULL,
    "ping" INTEGER NOT NULL,

    CONSTRAINT "ping_data_pkey" PRIMARY KEY ("user_id","region")
);

-- CreateTable
CREATE TABLE "playlists" (
    "guid" UUID NOT NULL,
    "name" TEXT,
    "team_size" INTEGER NOT NULL,
    "team_count" INTEGER NOT NULL,
    "active_custom" BOOLEAN DEFAULT true,
    "active_tutorial" BOOLEAN DEFAULT true,
    "active_quickplay" BOOLEAN DEFAULT true,
    "active_ranked" BOOLEAN DEFAULT true,
    "metadata" TEXT,
    "allow_new_player_matchmaking" BOOLEAN NOT NULL DEFAULT false,
    "is_practice_training_playlist" BOOLEAN NOT NULL DEFAULT false,
    "allow_replacement_droids" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("guid")
);

-- CreateTable
CREATE TABLE "quit_penalties" (
    "marks" INTEGER NOT NULL,
    "duration_s" INTEGER NOT NULL,

    CONSTRAINT "quit_penalties_pkey" PRIMARY KEY ("marks")
);

-- CreateTable
CREATE TABLE "recent_players" (
    "user_id" BIGINT NOT NULL,
    "recent_player_user_id" BIGINT NOT NULL,
    "timestamp" BIGINT NOT NULL DEFAULT (date_part('epoch'::text, now()) * (1000)::double precision),

    CONSTRAINT "recent_players_pkey" PRIMARY KEY ("user_id","recent_player_user_id")
);

-- CreateTable
CREATE TABLE "season_leaderboard_rewards" (
    "season" INTEGER NOT NULL,
    "highest_rank" INTEGER NOT NULL,
    "lowest_rank" INTEGER NOT NULL,
    "reward" TEXT,

    CONSTRAINT "season_leaderboard_rewards_pkey" PRIMARY KEY ("season","highest_rank","lowest_rank")
);

-- CreateTable
CREATE TABLE "season_rank" (
    "user_id" BIGINT NOT NULL,
    "season" INTEGER NOT NULL,
    "highest_rank" INTEGER NOT NULL,
    "season_rewards_granted" BOOLEAN NOT NULL,
    "leaderboard_rewards_granted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "season_rank_pkey" PRIMARY KEY ("user_id","season")
);

-- CreateTable
CREATE TABLE "season_rewards" (
    "season" INTEGER NOT NULL,
    "league_tier" INTEGER NOT NULL,
    "reward" TEXT,

    CONSTRAINT "season_rewards_pkey" PRIMARY KEY ("season","league_tier")
);

-- CreateTable
CREATE TABLE "settings_global" (
    "key" TEXT NOT NULL,
    "value" TEXT,

    CONSTRAINT "settings_global_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "skill" (
    "user_id" BIGINT NOT NULL,
    "playlist_guid" UUID NOT NULL,
    "match_flow" INTEGER NOT NULL,
    "current_mmr" INTEGER,
    "current_tier" INTEGER,
    "current_division" INTEGER,
    "current_division_progress" INTEGER,
    "volatility" INTEGER,
    "win_streak" INTEGER NOT NULL DEFAULT 0,
    "timestamp" INTEGER NOT NULL DEFAULT 0,
    "season" INTEGER,
    "skill_rating" INTEGER,
    "total_games_played" INTEGER,
    "wins" INTEGER,
    "mvps" INTEGER,
    "decay_timestamp" INTEGER,
    "skill_rating_decayed" INTEGER,
    "last_match_loss_forgiveness" INTEGER
);

-- CreateTable
CREATE TABLE "stats_global" (
    "key" TEXT NOT NULL,
    "value" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "stats_global_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "street_rank" (
    "user_id" BIGINT NOT NULL,
    "raw_xp" INTEGER NOT NULL,
    "last_rewarded_xp" INTEGER NOT NULL DEFAULT -1,
    "raw_xp_s6" INTEGER NOT NULL DEFAULT 0,
    "last_rewarded_xp_s6" INTEGER NOT NULL DEFAULT -1,

    CONSTRAINT "street_rank_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "street_rank_rewards" (
    "raw_level" INTEGER NOT NULL,
    "total_xp" INTEGER,
    "delta_xp" INTEGER,
    "tier" INTEGER,
    "level" INTEGER,
    "reward" TEXT,

    CONSTRAINT "street_rank_rewards_pkey" PRIMARY KEY ("raw_level")
);

-- CreateTable
CREATE TABLE "street_rank_rewards_season_6" (
    "raw_level" INTEGER NOT NULL,
    "total_xp" INTEGER,
    "delta_xp" INTEGER,
    "tier" INTEGER,
    "level" INTEGER,
    "reward" TEXT,

    CONSTRAINT "raw_level_s6_pk" PRIMARY KEY ("raw_level")
);

-- CreateTable
CREATE TABLE "thank_you_bonus_qualified_users" (
    "user_id" BIGINT NOT NULL,
    "granted_timestamp" INTEGER,
    "displayed" BOOLEAN,

    CONSTRAINT "thank_you_bonus_qualified_users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "thank_you_bonus_rewards" (
    "season" INTEGER NOT NULL,
    "rewards" TEXT NOT NULL,

    CONSTRAINT "thank_you_bonus_rewards_pkey" PRIMARY KEY ("season")
);

-- CreateTable
CREATE TABLE "user_migration_work" (
    "key" TEXT NOT NULL,
    "backend_id" BIGINT,

    CONSTRAINT "user_migration_work_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" BIGINT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '0',

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id","key")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "auth_provider" TEXT NOT NULL,
    "nucleus_id" BIGINT,
    "username" TEXT NOT NULL,
    "inserted_at" BIGINT,
    "last_authenticated_at" BIGINT,
    "username_visible" BOOLEAN DEFAULT true,
    "xbox_persona_id" BIGINT,
    "switch_persona_id" BIGINT,
    "playstation_persona_id" BIGINT,
    "origin_persona_id" BIGINT,
    "xbox_platform_id" BIGINT,
    "switch_platform_id" BIGINT,
    "playstation_platform_id" BIGINT,
    "origin_platform_id" BIGINT,
    "delete_scheduled_for" BIGINT,
    "publisher_username" TEXT NOT NULL,
    "last_authenticated_persona_namespace" TEXT NOT NULL,
    "steam_persona_id" BIGINT,
    "last_authenticated_platform" TEXT,
    "steam_platform_id" BIGINT,
    "epic_account_id" TEXT,
    "epic_connect_id" TEXT,
    "currency_expires" BOOLEAN,
    "epic_account_id_abandoned" TEXT,
    "epic_connect_id_abandoned" TEXT,
    "nucleus_id_abandoned" BIGINT,
    "publisher_username_code" INTEGER,
    "gamesight_id" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "value_transfer_fulfilled_nintendo" (
    "user_id" BIGINT NOT NULL,
    "entitlement_id" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "vsql_db_version" (
    "id" SERIAL NOT NULL,
    "version_id" BIGINT NOT NULL,
    "is_applied" BOOLEAN NOT NULL,
    "tstamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rollback_sql" TEXT NOT NULL,

    CONSTRAINT "vsql_db_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "backends_ordinal_unique" ON "backends"("ordinal");

-- CreateIndex
CREATE INDEX "commerce_codes_code_idx" ON "commerce_codes"("code");

-- CreateIndex
CREATE INDEX "commerce_codes_redeemed_user_id_idx" ON "commerce_codes_redeemed"("user_id", "code");

-- CreateIndex
CREATE INDEX "commerce_crew_inventory_equipped_crew_id_content" ON "commerce_crew_inventory_equipped"("crew_guid", "content");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_crew_inventory_equipped_pkey" ON "commerce_crew_inventory_equipped"("crew_guid", "slot");

-- CreateIndex
CREATE INDEX "commerce_offer_item_contents_index" ON "commerce_offer_item_contents"("offer", "item_index");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_offer_items_offer_item_index_key" ON "commerce_offer_items"("offer", "item_index");

-- CreateIndex
CREATE UNIQUE INDEX "crew_contracts_pkey" ON "crew_contracts"("crew_guid", "contract_guid");

-- CreateIndex
CREATE INDEX "crew_invites_crew_uuid" ON "crew_invites"("crew_guid");

-- CreateIndex
CREATE INDEX "crews_invites_sender_id_idx" ON "crew_invites"("sender_id");

-- CreateIndex
CREATE INDEX "crew_join_requests_crew_uuid" ON "crew_join_requests"("crew_guid");

-- CreateIndex
CREATE INDEX "crew_members_crew_uuid" ON "crew_members"("crew_guid");

-- CreateIndex
CREATE INDEX "crews_name_code_updated_at_idx" ON "crews"("name", "code", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "unique_crews_name" ON "crews"("name", "code");

-- CreateIndex
CREATE INDEX "data_manifest_platforms_platform_id" ON "data_manifest_changelists"("platform_id");

-- CreateIndex
CREATE INDEX "data_manifest_changelists_changelist_id" ON "data_manifest_packages"("changelist_id");

-- CreateIndex
CREATE UNIQUE INDEX "data_manifest_platforms_name_key" ON "data_manifest_platforms"("name");

-- CreateIndex
CREATE INDEX "fleet_images_fleet_image_id" ON "fleet_profiles"("fleet_image_id");

-- CreateIndex
CREATE INDEX "friend_requests_recipient_user_id" ON "friend_requests"("recipient_user_id");

-- CreateIndex
CREATE INDEX "friend_requests_sender_user_id" ON "friend_requests"("sender_user_id");

-- CreateIndex
CREATE INDEX "friends_friend_user_id" ON "friends"("friend_user_id");

-- CreateIndex
CREATE INDEX "join_in_progress_players_game_server_uuid" ON "join_in_progress_players"("game_server_uuid");

-- CreateIndex
CREATE INDEX "join_in_progress_players_last_poll_time_idx" ON "join_in_progress_players"("last_poll_time");

-- CreateIndex
CREATE INDEX "matchmaking_match_flow_idx" ON "matchmaking"("match_flow");

-- CreateIndex
CREATE INDEX "matchmaking_start_time_idx" ON "matchmaking"("start_time");

-- CreateIndex
CREATE INDEX "ping_data_user_id" ON "ping_data"("user_id");

-- CreateIndex
CREATE INDEX "recent_players_recent_player_user_id" ON "recent_players"("recent_player_user_id");

-- CreateIndex
CREATE INDEX "skill_playlist_guid" ON "skill"("playlist_guid");

-- CreateIndex
CREATE INDEX "skill_skill_rating_idx" ON "skill"("skill_rating");

-- CreateIndex
CREATE UNIQUE INDEX "skill_pkey" ON "skill"("user_id", "playlist_guid", "match_flow");

-- CreateIndex
CREATE INDEX "user_settings_user_id" ON "user_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_nucleus_id_unique" ON "users"("nucleus_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_epic_account_id_unique" ON "users"("epic_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_epic_connect_id_unique" ON "users"("epic_connect_id");

-- CreateIndex
CREATE INDEX "users_delete_scheduled_for_index" ON "users"("delete_scheduled_for");

-- CreateIndex
CREATE INDEX "users_epic_account_id_index" ON "users"("epic_account_id");

-- CreateIndex
CREATE INDEX "users_epic_connect_id_index" ON "users"("epic_connect_id");

-- CreateIndex
CREATE INDEX "users_last_authenticated_persona_namespace_index" ON "users"("last_authenticated_persona_namespace");

-- CreateIndex
CREATE INDEX "users_nucleus_id_auth_provider" ON "users"("nucleus_id", "auth_provider");

-- CreateIndex
CREATE INDEX "users_origin_platform_id_index" ON "users"("origin_platform_id");

-- CreateIndex
CREATE INDEX "users_playstation_platform_id_index" ON "users"("playstation_platform_id");

-- CreateIndex
CREATE INDEX "users_steam_platform_id_index" ON "users"("steam_platform_id");

-- CreateIndex
CREATE INDEX "users_switch_platform_id_index" ON "users"("switch_platform_id");

-- CreateIndex
CREATE INDEX "users_xbox_platform_id_index" ON "users"("xbox_platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "publisher_username_and_code_unique" ON "users"("publisher_username", "publisher_username_code");

-- CreateIndex
CREATE UNIQUE INDEX "value_transfer_fulfilled_nintendo_user_id_idx" ON "value_transfer_fulfilled_nintendo"("user_id", "entitlement_id");

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_user_id_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "brawl_pass" ADD CONSTRAINT "brawl_pass_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce_crew_inventory_equipped" ADD CONSTRAINT "commerce_crew_inventory_equipped_crew_uuid_fkey" FOREIGN KEY ("crew_guid") REFERENCES "crews"("guid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce_funds" ADD CONSTRAINT "commerce_funds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce_funds_expirations" ADD CONSTRAINT "commerce_funds_expirations_user_id_currency_fkey" FOREIGN KEY ("user_id", "currency") REFERENCES "commerce_funds"("user_id", "currency") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce_inventory_consumables" ADD CONSTRAINT "commerce_inventory_consumables_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce_inventory_durables" ADD CONSTRAINT "commerce_inventory_durables_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce_inventory_durables_inactive" ADD CONSTRAINT "commerce_inventory_durables_inactive_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce_inventory_equipped" ADD CONSTRAINT "commerce_inventory_equipped_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce_offer_currencies" ADD CONSTRAINT "commerce_offer_currencies_offer_fkey" FOREIGN KEY ("offer") REFERENCES "commerce_offers"("offer") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce_offer_item_contents" ADD CONSTRAINT "commerce_offer_item_contents_offer_item_index_fkey" FOREIGN KEY ("offer", "item_index") REFERENCES "commerce_offer_items"("offer", "item_index") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce_offer_items" ADD CONSTRAINT "commerce_offer_items_offer_fkey" FOREIGN KEY ("offer") REFERENCES "commerce_offers"("offer") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce_offers_purchased_with_limits" ADD CONSTRAINT "commerce_offers_purchased_with_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce_random_reward_accessories" ADD CONSTRAINT "commerce_random_reward_accessories_reward_group_index_fkey" FOREIGN KEY ("reward", "group_index") REFERENCES "commerce_random_reward_groups"("reward", "group_index") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_numerators" ADD CONSTRAINT "contract_numerators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_progress" ADD CONSTRAINT "contract_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crew_contracts" ADD CONSTRAINT "crew_contracts_crew_guid_fkey" FOREIGN KEY ("crew_guid") REFERENCES "crews"("guid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crew_contracts_user_rewards" ADD CONSTRAINT "crew_contracts_user_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crew_invites" ADD CONSTRAINT "crew_invites_crew_uuid_fkey" FOREIGN KEY ("crew_guid") REFERENCES "crews"("guid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crew_invites" ADD CONSTRAINT "crew_invites_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crew_invites" ADD CONSTRAINT "crew_invites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crew_join_requests" ADD CONSTRAINT "crew_join_requests_crew_uuid_fkey" FOREIGN KEY ("crew_guid") REFERENCES "crews"("guid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crew_join_requests" ADD CONSTRAINT "crew_join_requests_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crew_join_requests" ADD CONSTRAINT "crew_join_requests_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_crew_uuid_fkey" FOREIGN KEY ("crew_guid") REFERENCES "crews"("guid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crews" ADD CONSTRAINT "crews_captain_fkey" FOREIGN KEY ("captain") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "data_manifest_changelists" ADD CONSTRAINT "fk_data_manifest_platforms" FOREIGN KEY ("platform_id") REFERENCES "data_manifest_platforms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "data_manifest_packages" ADD CONSTRAINT "fk_data_manifest_changelists" FOREIGN KEY ("changelist_id") REFERENCES "data_manifest_changelists"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "deny_login_period_messages" ADD CONSTRAINT "fk_deny_login_periods" FOREIGN KEY ("deny_login_period_id") REFERENCES "deny_login_periods"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fleet_profiles" ADD CONSTRAINT "fk_fleet_images" FOREIGN KEY ("fleet_image_id") REFERENCES "fleet_images"("image_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "friends" ADD CONSTRAINT "friends_friend_user_id_fkey" FOREIGN KEY ("friend_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "friends" ADD CONSTRAINT "friends_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "key_value_pairs" ADD CONSTRAINT "key_value_pairs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "new_news_item_text" ADD CONSTRAINT "new_news_item_text_news_name_item_name_fkey" FOREIGN KEY ("news_name", "item_name") REFERENCES "new_news_items"("news_name", "name") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "new_news_items" ADD CONSTRAINT "new_news_items_news_name_fkey" FOREIGN KEY ("news_name") REFERENCES "new_news"("name") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "news_item_text" ADD CONSTRAINT "news_item_text_news_name_item_name_fkey" FOREIGN KEY ("news_name", "item_name") REFERENCES "news_items"("news_name", "name") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_news_name_fkey" FOREIGN KEY ("news_name") REFERENCES "news"("name") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ping_data" ADD CONSTRAINT "ping_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recent_players" ADD CONSTRAINT "recent_players_recent_player_user_id_fkey" FOREIGN KEY ("recent_player_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recent_players" ADD CONSTRAINT "recent_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "season_rank" ADD CONSTRAINT "season_rank_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "skill" ADD CONSTRAINT "skill_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "street_rank" ADD CONSTRAINT "street_rank_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
