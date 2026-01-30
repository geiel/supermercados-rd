CREATE TABLE "product_broken_images" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_broken_images_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"productId" integer NOT NULL,
	"imageUrl" text NOT NULL,
	"reportedAt" timestamp DEFAULT now() NOT NULL,
	"isFixed" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "product_broken_images" ADD CONSTRAINT "product_broken_images_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;