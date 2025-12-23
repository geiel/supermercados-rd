import { relations } from "drizzle-orm";
import { integer, numeric, pgTable, text } from "drizzle-orm/pg-core";
import { products } from "./products";

export const todaysDeals = pgTable("todays_deals", {
    productId: integer().primaryKey().references(() => products.id),
    name: text().notNull(),
    unit: text().notNull(),
    image: text(),
    rank: numeric(),
    brandName: text().notNull(),
    possibleBrandName: text(),
    priceBeforeToday: numeric(),
    priceToday: numeric().notNull(),
    dropAmount: numeric().notNull(),
    dropPercentage: numeric().notNull()
});

export const todaysDealsRelations = relations(todaysDeals, ({ one }) => ({
    product: one(products, {
      fields: [todaysDeals.productId],
      references: [products.id],
    }),
}));