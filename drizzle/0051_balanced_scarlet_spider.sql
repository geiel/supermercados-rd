ALTER TABLE "unverified_products" ADD COLUMN "shopId" integer;--> statement-breakpoint
ALTER TABLE "unverified_products" ADD CONSTRAINT "unverified_products_shopId_shops_id_fk" FOREIGN KEY ("shopId") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "unverified_products_shopId_idx" ON "unverified_products" USING btree ("shopId");
