ALTER TABLE "groups" ADD COLUMN "isComparable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "parentGroupId" integer;--> statement-breakpoint
ALTER TABLE "search_phrases" ADD COLUMN "groupId" integer;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_parentGroupId_groups_id_fk" FOREIGN KEY ("parentGroupId") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_phrases" ADD CONSTRAINT "search_phrases_groupId_groups_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;