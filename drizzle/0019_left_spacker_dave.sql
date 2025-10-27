CREATE TABLE "todays_deals" (
	"productId" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"image" text,
	"rank" numeric,
	"brandName" text NOT NULL,
	"priceBeforeToday" numeric,
	"priceToday" numeric NOT NULL,
	"dropAmount" numeric NOT NULL,
	"dropPercentage" numeric NOT NULL
);
