CREATE TABLE "products_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "products_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "categoryId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_products_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."products_categories"("id") ON DELETE no action ON UPDATE no action;