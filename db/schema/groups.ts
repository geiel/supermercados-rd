import { integer, pgTable, primaryKey, text, boolean } from "drizzle-orm/pg-core";
import { products } from "./products";
import { relations } from "drizzle-orm";

export const groups = pgTable("groups", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    description: text(),
    humanNameId: text().unique().notNull(),
    cheaperProductId: integer().references(() => products.id),
    bestValueProductId: integer().references(() => products.id),
    showSearch: boolean().notNull().default(true)
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

export const complexCategories = pgTable("complex_categories", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    description: text(),
    showHomePage: boolean().notNull().default(false),
    humanNameId: text().unique().notNull()
});

export const complexCategoriesRelations = relations(complexCategories, ({ many }) => ({
    complexCategoryGroups: many(complexCategoriesGroups)
}));

export const complexCategoriesGroups = pgTable("complex_categories_groups", {
    complexCategoryId: integer().notNull().references(() => complexCategories.id),
    groupId: integer().notNull().references(() => groups.id),
}, (table) => [primaryKey({ columns: [table.complexCategoryId, table.groupId] })]);

export const complexCategoriesGroupsRelations = relations(complexCategoriesGroups, ({ one }) => ({
    complexCategory: one(complexCategories, { fields: [complexCategoriesGroups.complexCategoryId], references: [complexCategories.id] }),
    group: one(groups, { fields: [complexCategoriesGroups.groupId], references: [groups.id] })
}));

export type productsGroupsSelect = typeof productsGroups.$inferSelect;