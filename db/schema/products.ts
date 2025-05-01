import { relations } from "drizzle-orm";
import {
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const products = pgTable(
  "products",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    categoryId: integer()
      .notNull()
      .references(() => productsCategories.id),
    name: text().notNull(),
    image: text(),
    unit: text().notNull(),
  },
  (table) => ({
    uniqueProduct: unique("unique_product").on(table.name, table.unit),
  })
);

export const productsRelations = relations(products, ({ many, one }) => ({
  shopCurrentPrices: many(productsShopsPrices),
  pricesHistory: many(productsPricesHistory),
  category: one(productsCategories, {
    fields: [products.categoryId],
    references: [productsCategories.id],
  }),
}));

export const unitTracker = pgTable("unit_tracker", {
  unit: text().primaryKey().notNull(),
  productName: text().notNull(),
});

export const productsCategories = pgTable("products_categories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
});

export const productsCategoriesRelations = relations(
  productsCategories,
  ({ many }) => ({
    products: many(products),
  })
);

export const shops = pgTable("shops", {
  id: integer().primaryKey(),
  name: text().notNull(),
  logo: text().notNull(),
});

export const shopsRelations = relations(shops, ({ many }) => ({
  productPricesHistory: many(productsPricesHistory),
}));

export const productsShopsPrices = pgTable(
  "products_shops_prices",
  {
    productId: integer()
      .notNull()
      .references(() => products.id),
    shopId: integer()
      .notNull()
      .references(() => shops.id),
    url: text().notNull(),
    api: text(),
    currentPrice: numeric(),
    regularPrice: numeric(),
    updateAt: timestamp({ withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.productId, table.shopId] })]
);

export const productsShopsPricesRelations = relations(
  productsShopsPrices,
  ({ one }) => ({
    product: one(products, {
      fields: [productsShopsPrices.productId],
      references: [products.id],
    }),
    shop: one(shops, {
      fields: [productsShopsPrices.shopId],
      references: [shops.id],
    }),
  })
);

export const productsPricesHistory = pgTable("products_prices_history", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  productId: integer()
    .notNull()
    .references(() => products.id),
  shopId: integer()
    .notNull()
    .references(() => shops.id),
  price: numeric().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull(),
});

export const productsPricesHistoryRelations = relations(
  productsPricesHistory,
  ({ one }) => ({
    product: one(products, {
      fields: [productsPricesHistory.productId],
      references: [products.id],
    }),
    shop: one(shops, {
      fields: [productsPricesHistory.shopId],
      references: [shops.id],
    }),
  })
);

export type productsSelect = typeof products.$inferSelect;
export type productsInsert = typeof products.$inferInsert;
export type productsShopsPrices = typeof productsShopsPrices.$inferSelect;
export type productsShopsPricesInsert = typeof productsShopsPrices.$inferInsert;
export type shopsSelect = typeof shops.$inferSelect;
export type productsCategoriesSelect = typeof productsCategories.$inferSelect;
export type unitTrackerInsert = typeof unitTracker.$inferInsert;
