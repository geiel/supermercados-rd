import { integer, numeric, pgTable, text } from "drizzle-orm/pg-core";

export const todaysDeals = pgTable("todays_deals", {
    productId: integer().primaryKey(),
    name: text().notNull(),
    unit: text().notNull(),
    image: text(),
    rank: numeric(),
    brandName: text().notNull(),
    priceBeforeToday: numeric(),
    priceToday: numeric().notNull(),
    dropAmount: numeric().notNull(),
    dropPercentage: numeric().notNull()
});