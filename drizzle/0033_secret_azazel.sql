ALTER TABLE "todays_deals" ADD COLUMN "shopId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "todays_deals" ADD COLUMN "amountOfShops" numeric NOT NULL;--> statement-breakpoint
ALTER TABLE "todays_deals" ADD CONSTRAINT "todays_deals_shopId_shops_id_fk" FOREIGN KEY ("shopId") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;