CREATE TYPE "public"."visibility" AS ENUM('visible', 'hidden');--> statement-breakpoint
CREATE TABLE "products_visibility_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "products_visibility_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"productId" integer NOT NULL,
	"shopId" integer NOT NULL,
	"visibility" "visibility" NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products_visibility_history" ADD CONSTRAINT "products_visibility_history_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_visibility_history" ADD CONSTRAINT "products_visibility_history_shopId_shops_id_fk" FOREIGN KEY ("shopId") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;