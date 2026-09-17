ALTER TABLE "badges" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_badges" ADD COLUMN "seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "badges" DROP COLUMN "seen_at";