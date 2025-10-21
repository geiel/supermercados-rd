import { integer, pgTable, text, unique } from "drizzle-orm/pg-core";
import { products } from "./products";
import { relations, sql } from "drizzle-orm";

export const list = pgTable("list", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: text().notNull(),
    selectedShops: text().array().notNull().default(sql`ARRAY[]::text[]`),
});

export const listRelations = relations(list, ({ many }) => ({
    items: many(listItems)
}));

export const listItems = pgTable("list_items", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    listId: integer().notNull().references(() => list.id),
    productId: integer().notNull().references(() => products.id),
    amount: integer()
}, (table) => [
    unique("list_product_unique").on(table.listId, table.productId)
]);

export const listItemsRelations = relations(listItems, ({ one }) => ({
    list: one(list, {
        fields: [listItems.listId],
        references: [list.id],
    }),
    product: one(products, {
        fields: [listItems.productId],
        references: [products.id],
    }),
}));

export type listItemsSelect = typeof listItems.$inferSelect;