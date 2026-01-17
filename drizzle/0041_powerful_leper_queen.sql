ALTER TABLE "list" ADD COLUMN "isShared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "list" ADD COLUMN "hideProfile" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "list" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;