CREATE TYPE "public"."airing_status" AS ENUM('airing', 'finished', 'not_yet_released', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."avatar_type" AS ENUM('custom', 'preset');--> statement-breakpoint
CREATE TYPE "public"."badge_tier" AS ENUM('bronze', 'silver', 'gold', 'platinum');--> statement-breakpoint
CREATE TYPE "public"."credit_role" AS ENUM('studio', 'director', 'writer', 'composer', 'character_design', 'original_creator', 'producer', 'voice', 'cast');--> statement-breakpoint
CREATE TYPE "public"."drop_reason" AS ENUM('pacing', 'characters', 'art', 'plot', 'no_time', 'other');--> statement-breakpoint
CREATE TYPE "public"."entry_status" AS ENUM('watching', 'completed', 'dropped', 'planning', 'paused');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."media_source" AS ENUM('anilist', 'tmdb');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('anime', 'show', 'movie');--> statement-breakpoint
CREATE TYPE "public"."oauth_provider" AS ENUM('google');--> statement-breakpoint
CREATE TYPE "public"."person_kind" AS ENUM('person', 'studio');--> statement-breakpoint
CREATE TYPE "public"."profile_theme" AS ENUM('cinema', 'manga', 'retro');--> statement-breakpoint
CREATE TYPE "public"."rating_scale" AS ENUM('ten', 'hundred', 'stars');--> statement-breakpoint
CREATE TYPE "public"."season" AS ENUM('winter', 'spring', 'summer', 'fall');--> statement-breakpoint
CREATE TYPE "public"."spoiler_mode" AS ENUM('off', 'soft', 'strict');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"key_hash" char(64) NOT NULL,
	"name" varchar(60) NOT NULL,
	"scopes" text[] DEFAULT ARRAY['read']::text[] NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"token_hash" char(64) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "oauth_provider" NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"token_hash" char(64) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" char(64) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" "inet",
	"user_agent" varchar(300)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" varchar(30) NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified_at" timestamp with time zone,
	"password_hash" text,
	"display_name" varchar(60),
	"avatar_url" varchar(500),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "airing_schedule" (
	"id" uuid PRIMARY KEY NOT NULL,
	"media_id" uuid NOT NULL,
	"episode_number" smallint NOT NULL,
	"season_number" smallint,
	"airing_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "airing_schedule_media_season_episode_key" UNIQUE NULLS NOT DISTINCT("media_id","season_number","episode_number")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source" "media_source" NOT NULL,
	"external_id" integer NOT NULL,
	"mal_id" integer,
	"imdb_id" varchar(20),
	"media_type" "media_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"title_original" varchar(200),
	"synopsis" text,
	"cover_image" varchar(500),
	"banner_image" varchar(500),
	"genres" text[],
	"year" smallint,
	"season" "season",
	"total_episodes" smallint,
	"episode_duration" smallint,
	"avg_score" smallint,
	"popularity" integer,
	"airing_status" "airing_status",
	"has_sequel" boolean DEFAULT false NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_credits" (
	"media_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"role" "credit_role" NOT NULL,
	"is_main" boolean DEFAULT false NOT NULL,
	CONSTRAINT "media_credits_media_id_person_id_role_pk" PRIMARY KEY("media_id","person_id","role")
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source" "media_source" NOT NULL,
	"external_id" integer NOT NULL,
	"kind" "person_kind" NOT NULL,
	"name" varchar(150) NOT NULL,
	"name_native" varchar(150),
	"image_url" varchar(500),
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"collection_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"position" numeric DEFAULT '0' NOT NULL,
	"note" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" varchar(60) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"cover_image" varchar(500),
	"is_public" boolean DEFAULT true NOT NULL,
	"is_ranked" boolean DEFAULT false NOT NULL,
	"item_count" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"status" "entry_status" NOT NULL,
	"user_rating" smallint,
	"episodes_watched" smallint DEFAULT 0 NOT NULL,
	"rewatch_count" smallint DEFAULT 0 NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"drop_reason" "drop_reason",
	"notes" text,
	"started_at" date,
	"finished_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_entries_user_rating_range" CHECK ("media_entries"."user_rating" is null or ("media_entries"."user_rating" between 10 and 100))
);
--> statement-breakpoint
CREATE TABLE "media_entry_tags" (
	"media_entry_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "media_entry_tags_media_entry_id_tag_id_pk" PRIMARY KEY("media_entry_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"media_entry_id" uuid NOT NULL,
	"content" text NOT NULL,
	"contains_spoilers" boolean DEFAULT false NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(30) NOT NULL,
	"color" varchar(7),
	"is_public" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watch_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"media_entry_id" uuid NOT NULL,
	"episodes_delta" smallint DEFAULT 1 NOT NULL,
	"is_rewatch" boolean DEFAULT false NOT NULL,
	"watched_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id"),
	CONSTRAINT "follows_no_self" CHECK ("follows"."follower_id" <> "follows"."following_id")
);
--> statement-breakpoint
CREATE TABLE "review_likes" (
	"user_id" uuid NOT NULL,
	"review_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_likes_user_id_review_id_pk" PRIMARY KEY("user_id","review_id")
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon_name" varchar(50),
	"tier" "badge_tier" NOT NULL,
	"criteria" jsonb NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"sort_order" smallint
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"user_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"progress" jsonb,
	CONSTRAINT "user_badges_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "preset_avatars" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"image_url" varchar(500) NOT NULL,
	"category" varchar(50),
	"is_premium" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"banner_url" varchar(500),
	"avatar_type" "avatar_type" DEFAULT 'preset' NOT NULL,
	"avatar_preset_id" varchar(50),
	"bio" text,
	"theme" "profile_theme" DEFAULT 'cinema' NOT NULL,
	"featured_badge_id" uuid,
	"social_links" jsonb,
	"is_private" boolean DEFAULT false NOT NULL,
	"timezone" varchar(50) DEFAULT 'America/Sao_Paulo' NOT NULL,
	"rating_scale" "rating_scale" DEFAULT 'ten' NOT NULL,
	"spoiler_mode" "spoiler_mode" DEFAULT 'soft' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_queue" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"type" varchar(40) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"last_error" text,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" varchar(120) PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_end" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airing_schedule" ADD CONSTRAINT "airing_schedule_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_credits" ADD CONSTRAINT "media_credits_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_credits" ADD CONSTRAINT "media_credits_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_entries" ADD CONSTRAINT "media_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_entries" ADD CONSTRAINT "media_entries_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_entry_tags" ADD CONSTRAINT "media_entry_tags_media_entry_id_media_entries_id_fk" FOREIGN KEY ("media_entry_id") REFERENCES "public"."media_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_entry_tags" ADD CONSTRAINT "media_entry_tags_tag_id_user_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."user_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_media_entry_id_media_entries_id_fk" FOREIGN KEY ("media_entry_id") REFERENCES "public"."media_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_events" ADD CONSTRAINT "watch_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_events" ADD CONSTRAINT "watch_events_media_entry_id_media_entries_id_fk" FOREIGN KEY ("media_entry_id") REFERENCES "public"."media_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_likes" ADD CONSTRAINT "review_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_likes" ADD CONSTRAINT "review_likes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_avatar_preset_id_preset_avatars_id_fk" FOREIGN KEY ("avatar_preset_id") REFERENCES "public"."preset_avatars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_featured_badge_id_badges_id_fk" FOREIGN KEY ("featured_badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_queue" ADD CONSTRAINT "job_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_accounts_provider_account_key" ON "oauth_accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_key" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_deleted_at_idx" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "airing_schedule_airing_at_idx" ON "airing_schedule" USING btree ("airing_at");--> statement-breakpoint
CREATE UNIQUE INDEX "media_source_type_external_key" ON "media" USING btree ("source","media_type","external_id");--> statement-breakpoint
CREATE INDEX "media_type_popularity_idx" ON "media" USING btree ("media_type","popularity" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "media_mal_id_idx" ON "media" USING btree ("mal_id") WHERE "media"."mal_id" is not null;--> statement-breakpoint
CREATE INDEX "media_genres_idx" ON "media" USING gin ("genres");--> statement-breakpoint
CREATE INDEX "media_credits_person_role_idx" ON "media_credits" USING btree ("person_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "people_source_external_kind_key" ON "people" USING btree ("source","external_id","kind");--> statement-breakpoint
CREATE INDEX "people_name_idx" ON "people" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_items_collection_media_key" ON "collection_items" USING btree ("collection_id","media_id");--> statement-breakpoint
CREATE INDEX "collection_items_collection_position_idx" ON "collection_items" USING btree ("collection_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "collections_user_slug_key" ON "collections" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "collections_user_idx" ON "collections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_entries_user_media_key" ON "media_entries" USING btree ("user_id","media_id");--> statement-breakpoint
CREATE INDEX "media_entries_user_status_idx" ON "media_entries" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "media_entries_user_updated_idx" ON "media_entries" USING btree ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "media_entry_tags_tag_idx" ON "media_entry_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_media_entry_key" ON "reviews" USING btree ("media_entry_id");--> statement-breakpoint
CREATE INDEX "reviews_user_created_idx" ON "reviews" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "user_tags_user_name_key" ON "user_tags" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX "watch_events_user_watched_idx" ON "watch_events" USING btree ("user_id","watched_on" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "watch_events_media_entry_idx" ON "watch_events" USING btree ("media_entry_id");--> statement-breakpoint
CREATE INDEX "follows_following_idx" ON "follows" USING btree ("following_id");--> statement-breakpoint
CREATE INDEX "review_likes_review_idx" ON "review_likes" USING btree ("review_id");--> statement-breakpoint
CREATE UNIQUE INDEX "badges_slug_key" ON "badges" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "job_queue_status_run_at_idx" ON "job_queue" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX "job_queue_user_created_idx" ON "job_queue" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "rate_limits_window_end_idx" ON "rate_limits" USING btree ("window_end");