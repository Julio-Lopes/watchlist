ALTER TABLE "media" ADD COLUMN "airing_weekday" smallint;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "airing_time" varchar(5);--> statement-breakpoint
CREATE INDEX "media_season_idx" ON "media" USING btree ("source","year","season");