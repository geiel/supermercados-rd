import { relations } from "drizzle-orm";
import { integer, numeric, pgTable, primaryKey, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { products, shops } from "./products";

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
    dropPercentage: numeric().notNull(),
    shopId: integer().notNull().references(() => shops.id),
    amountOfShops: numeric().notNull(),
    dateWasSet: timestamp({ withTimezone: true }).notNull()
});

export const todaysDealsRelations = relations(todaysDeals, ({ one }) => ({
    product: one(products, {
      fields: [todaysDeals.productId],
      references: [products.id],
    }),
}));

export const homePageCategories = pgTable("home_page_categories", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    description: text(),
    visible: boolean().notNull().default(true),
});

export const homePageCategoriesProducts = pgTable("home_page_categories_products", {
    homePageCategoryId: integer().notNull().references(() => homePageCategories.id),
    productId: integer().notNull().references(() => products.id),
}, (table) => [primaryKey({ columns: [table.homePageCategoryId, table.productId] })]);

export const homePageCategoriesProductsRelations = relations(homePageCategoriesProducts, ({ one }) => ({
    category: one(homePageCategories, {
        fields: [homePageCategoriesProducts.homePageCategoryId],
        references: [homePageCategories.id],
    }),
    product: one(products, {
        fields: [homePageCategoriesProducts.productId],
        references: [products.id],
    }),
}));