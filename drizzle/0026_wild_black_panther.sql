ALTER TABLE "groups" ADD COLUMN "humanNameId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_humanNameId_unique" UNIQUE("humanNameId");