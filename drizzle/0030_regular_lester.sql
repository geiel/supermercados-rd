CREATE TABLE "list_group_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "list_group_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"listId" integer NOT NULL,
	"groupId" integer NOT NULL,
	"amount" integer,
	CONSTRAINT "list_group_item_unique" UNIQUE("listId","groupId")
);
--> statement-breakpoint
ALTER TABLE "list_group_items" ADD CONSTRAINT "list_group_items_listId_list_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."list"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_group_items" ADD CONSTRAINT "list_group_items_groupId_groups_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;