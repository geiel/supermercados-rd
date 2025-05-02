ALTER TABLE "products" DROP CONSTRAINT "unique_product";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "brandId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "unique_product" UNIQUE("name","unit","brandId");