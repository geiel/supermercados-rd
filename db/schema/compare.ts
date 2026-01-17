import { boolean, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { products } from "./products";
import { relations, sql } from "drizzle-orm";
import { groups } from "./groups";

export const list = pgTable("list", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: text().notNull(),
    selectedShops: text().array().notNull().default(sql`ARRAY[]::text[]`),
    name: text().notNull(),
    isShared: boolean().notNull().default(false),
    hideProfile: boolean().notNull().default(false),
    updatedAt: timestamp().defaultNow().notNull(),
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

export const listGroupItems = pgTable("list_group_items", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    listId: integer().notNull().references(() => list.id),
    groupId: integer().notNull().references(() => groups.id),
    amount: integer(),
    ignoredProducts: text().array().notNull().default(sql`ARRAY[]::text[]`),
}, (table) => [
    unique("list_group_item_unique").on(table.listId, table.groupId)
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

export type ListSelect = typeof list.$inferSelect;
export type listItemsSelect = typeof listItems.$inferSelect;
export type listGroupItemsSelect = typeof listGroupItems.$inferSelect;