ALTER TABLE "groups" ADD COLUMN "cheaperProductId" integer;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "bestValueProductId" integer;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_cheaperProductId_products_id_fk" FOREIGN KEY ("cheaperProductId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_bestValueProductId_products_id_fk" FOREIGN KEY ("bestValueProductId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;