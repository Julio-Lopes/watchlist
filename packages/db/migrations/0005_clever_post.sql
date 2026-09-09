ALTER TABLE "collections" ADD COLUMN "cover_media_id" uuid;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN "cover_image";