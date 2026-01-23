import { integer, pgTable, primaryKey, text, boolean, jsonb } from "drizzle-orm/pg-core";
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
    parentGroupId: integer()
});

export const groupsRelations = relations(groups, ({ many, one }) => ({
    products: many(productsGroups),
    parentGroup: one(groups, { fields: [groups.parentGroupId], references: [groups.id] })
}));

export const productsGroups = pgTable("products_groups", {
    productId: integer().notNull().references(() => products.id),
    groupId: integer().notNull().references(() => groups.id),
}, (table) => [primaryKey({ columns: [table.productId, table.groupId] })]);

export const productsGroupsRelations = relations(productsGroups, ({ one }) => ({
    product: one(products, { fields: [productsGroups.productId], references: [products.id] }),
    group: one(groups, { fields: [productsGroups.groupId], references: [groups.id] })
}));

export const mainCategories = pgTable("main_categories", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    description: text(),
    humanNameId: text().unique().notNull(),
    imageUrl: text()
});

export const mainCategoriesRelations = relations(mainCategories, ({ many }) => ({
    subCategories: many(subCategories)
}));

export const subCategories = pgTable("sub_categories", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    description: text(),
    humanNameId: text().unique().notNull(),
    mainCategoryId: integer().notNull().references(() => mainCategories.id),
    imageUrl: text(),
    isExplorable: boolean().notNull().default(true),
});

export const subCategoriesGroups = pgTable("sub_categories_groups", {
    subCategoryId: integer().notNull().references(() => subCategories.id),
    groupId: integer().notNull().references(() => groups.id),
}, (table) => [primaryKey({ columns: [table.subCategoryId, table.groupId] })]);

export const subCategoriesGroupsRelations = relations(subCategoriesGroups, ({ one, many }) => ({
    subCategory: one(subCategories, { fields: [subCategoriesGroups.subCategoryId], references: [subCategories.id] }),
    group: one(groups, { fields: [subCategoriesGroups.groupId], references: [groups.id] }),
    filters: many(subCategoriesFilters)
}));

export const subCategoriesFilters = pgTable("sub_categories_filters", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    subCategoryId: integer().notNull().references(() => subCategories.id),
    filterType: text().notNull(),
    filterValues: jsonb().notNull().default([]),
    filterName: text(),
});

export const subCategoriesFiltersRelations = relations(subCategoriesFilters, ({ one }) => ({
    subCategory: one(subCategories, { fields: [subCategoriesFilters.subCategoryId], references: [subCategories.id] })
}));

export type productsGroupsSelect = typeof productsGroups.$inferSelect;