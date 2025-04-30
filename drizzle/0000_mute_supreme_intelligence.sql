CREATE TABLE "products" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"image" text,
	"unit" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products_prices_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "products_prices_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"productId" integer NOT NULL,
	"shopId" integer NOT NULL,
	"price" numeric NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products_shops_prices" (
	"productId" integer NOT NULL,
	"shopId" integer NOT NULL,
	"url" text NOT NULL,
	"currentPrice" numeric,
	"updateAt" timestamp with time zone,
	CONSTRAINT "products_shops_prices_productId_shopId_pk" PRIMARY KEY("productId","shopId")
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products_prices_history" ADD CONSTRAINT "products_prices_history_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_prices_history" ADD CONSTRAINT "products_prices_history_shopId_shops_id_fk" FOREIGN KEY ("shopId") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_shops_prices" ADD CONSTRAINT "products_shops_prices_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_shops_prices" ADD CONSTRAINT "products_shops_prices_shopId_shops_id_fk" FOREIGN KEY ("shopId") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;