ALTER TABLE "user_profiles" ADD COLUMN "banner_media_id" uuid;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_banner_media_id_media_id_fk" FOREIGN KEY ("banner_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" DROP COLUMN "banner_url";