CREATE TABLE "home_page_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "home_page_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "home_page_categories_products" (
	"homePageCategoryId" integer NOT NULL,
	"productId" integer NOT NULL,
	CONSTRAINT "home_page_categories_products_homePageCategoryId_productId_pk" PRIMARY KEY("homePageCategoryId","productId")
);
--> statement-breakpoint
ALTER TABLE "home_page_categories_products" ADD CONSTRAINT "home_page_categories_products_homePageCategoryId_home_page_categories_id_fk" FOREIGN KEY ("homePageCategoryId") REFERENCES "public"."home_page_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_page_categories_products" ADD CONSTRAINT "home_page_categories_products_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;