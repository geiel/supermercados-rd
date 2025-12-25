CREATE TABLE "complex_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "complex_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "complex_categories_groups" (
	"complexCategoryId" integer NOT NULL,
	"groupId" integer NOT NULL,
	CONSTRAINT "complex_categories_groups_complexCategoryId_groupId_pk" PRIMARY KEY("complexCategoryId","groupId")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "products_groups" (
	"productId" integer NOT NULL,
	"groupId" integer NOT NULL,
	CONSTRAINT "products_groups_productId_groupId_pk" PRIMARY KEY("productId","groupId")
);
--> statement-breakpoint
ALTER TABLE "complex_categories_groups" ADD CONSTRAINT "complex_categories_groups_complexCategoryId_complex_categories_id_fk" FOREIGN KEY ("complexCategoryId") REFERENCES "public"."complex_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complex_categories_groups" ADD CONSTRAINT "complex_categories_groups_groupId_groups_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_groups" ADD CONSTRAINT "products_groups_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_groups" ADD CONSTRAINT "products_groups_groupId_groups_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;