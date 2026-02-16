CREATE TABLE "unverified_products" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "unverified_products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"categoryId" integer NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"unit" text NOT NULL,
	"brandId" integer NOT NULL,
	"deleted" boolean DEFAULT false,
	"rank" numeric,
	"relevance" numeric,
	"possibleBrandId" integer,
	"baseUnit" text,
	"baseUnitAmount" numeric,
	"shopId" integer,
	"url" text,
	"api" text,
	CONSTRAINT "unique_unverified_product" UNIQUE("name","unit","brandId","shopId","url","api")
);
--> statement-breakpoint
ALTER TABLE "unverified_products" ADD CONSTRAINT "unverified_products_categoryId_products_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."products_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unverified_products" ADD CONSTRAINT "unverified_products_brandId_products_brands_id_fk" FOREIGN KEY ("brandId") REFERENCES "public"."products_brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unverified_products" ADD CONSTRAINT "unverified_products_possibleBrandId_products_brands_id_fk" FOREIGN KEY ("possibleBrandId") REFERENCES "public"."products_brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unverified_products" ADD CONSTRAINT "unverified_products_shopId_shops_id_fk" FOREIGN KEY ("shopId") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;