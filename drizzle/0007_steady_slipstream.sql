CREATE TABLE "products_brands" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "products_brands_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "products_brands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brandId" integer;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_products_brands_id_fk" FOREIGN KEY ("brandId") REFERENCES "public"."products_brands"("id") ON DELETE no action ON UPDATE no action;