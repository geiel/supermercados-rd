CREATE TABLE "main_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "main_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text,
	"humanNameId" text NOT NULL,
	CONSTRAINT "main_categories_humanNameId_unique" UNIQUE("humanNameId")
);
--> statement-breakpoint
CREATE TABLE "sub_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sub_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text,
	"humanNameId" text NOT NULL,
	"mainCategoryId" integer NOT NULL,
	CONSTRAINT "sub_categories_humanNameId_unique" UNIQUE("humanNameId")
);
--> statement-breakpoint
CREATE TABLE "sub_categories_filters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sub_categories_filters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subCategoryId" integer NOT NULL,
	"filterType" text NOT NULL,
	"filterValues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"filterName" text
);
--> statement-breakpoint
CREATE TABLE "sub_categories_groups" (
	"subCategoryId" integer NOT NULL,
	"groupId" integer NOT NULL,
	CONSTRAINT "sub_categories_groups_subCategoryId_groupId_pk" PRIMARY KEY("subCategoryId","groupId")
);
--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "parentGroupId" integer;--> statement-breakpoint
ALTER TABLE "sub_categories" ADD CONSTRAINT "sub_categories_mainCategoryId_main_categories_id_fk" FOREIGN KEY ("mainCategoryId") REFERENCES "public"."main_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_categories_filters" ADD CONSTRAINT "sub_categories_filters_subCategoryId_sub_categories_id_fk" FOREIGN KEY ("subCategoryId") REFERENCES "public"."sub_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_categories_groups" ADD CONSTRAINT "sub_categories_groups_subCategoryId_sub_categories_id_fk" FOREIGN KEY ("subCategoryId") REFERENCES "public"."sub_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_categories_groups" ADD CONSTRAINT "sub_categories_groups_groupId_groups_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;