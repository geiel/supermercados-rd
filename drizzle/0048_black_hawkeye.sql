CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"humanNameId" text NOT NULL,
	"icon" text,
	CONSTRAINT "categories_humanNameId_unique" UNIQUE("humanNameId")
);
--> statement-breakpoint
CREATE TABLE "categories_groups" (
	"categoryId" integer NOT NULL,
	"groupId" integer NOT NULL,
	CONSTRAINT "categories_groups_categoryId_groupId_pk" PRIMARY KEY("categoryId","groupId")
);
--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "imageUrl" text;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "showOnlyGroups" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "categories_groups" ADD CONSTRAINT "categories_groups_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories_groups" ADD CONSTRAINT "categories_groups_groupId_groups_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;