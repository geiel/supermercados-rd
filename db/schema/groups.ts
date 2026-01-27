import { integer, pgTable, primaryKey, text, boolean, AnyPgColumn } from "drizzle-orm/pg-core";
import { products } from "./products";
import { relations } from "drizzle-orm";

export const groups = pgTable("groups", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    description: text(),
    humanNameId: text().unique().notNull(),
    cheaperProductId: integer().references(() => products.id),
    bestValueProductId: integer().references(() => products.id),
    showSearch: boolean().notNull().default(true),
    compareBy: text(),
    isComparable: boolean().notNull().default(true),
    parentGroupId: integer().references((): AnyPgColumn => groups.id)
});

export const groupsRelations = relations(groups, ({ many }) => ({
    products: many(productsGroups)
}));

export const productsGroups = pgTable("products_groups", {
    productId: integer().notNull().references(() => products.id),
    groupId: integer().notNull().references(() => groups.id),
}, (table) => [primaryKey({ columns: [table.productId, table.groupId] })]);

export const productsGroupsRelations = relations(productsGroups, ({ one }) => ({
    product: one(products, { fields: [productsGroups.productId], references: [products.id] }),
    group: one(groups, { fields: [productsGroups.groupId], references: [groups.id] })
}));

export type productsGroupsSelect = typeof productsGroups.$inferSelect;