CREATE TYPE "public"."category_suggestion_type" AS ENUM('new_category', 'add_product_to_category');--> statement-breakpoint
CREATE TABLE "category_suggestions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "category_suggestions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" "category_suggestion_type" NOT NULL,
	"suggestedName" text,
	"existingGroupId" integer,
	"productId" integer,
	"userEmail" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "category_suggestions" ADD CONSTRAINT "category_suggestions_existingGroupId_groups_id_fk" FOREIGN KEY ("existingGroupId") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_suggestions" ADD CONSTRAINT "category_suggestions_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;