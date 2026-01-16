import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { products, shops } from "./products";
import { groups } from "./groups";


export const productIssueEnum = pgEnum('product_issue', ['incorrect_brand', 'incorrect_price', 'incorrect_image', 'incorrect_category', 
    'link_broken', 'link_incorrect', 'incorrect_unit']);

export const feedback = pgTable("feedback", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: text(),
    feedback: text().notNull(),
    createdAt: timestamp().notNull().default(sql`now()`),
});

export const productIssueReports = pgTable("product_issue_reports", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    issue: productIssueEnum().notNull(),
    productId: integer().notNull().references(() => products.id),
    shopId: integer().references(() => shops.id),
    userId: text(),
    createdAt: timestamp().notNull().default(sql`now()`),
});

export const categorySuggestionTypeEnum = pgEnum('category_suggestion_type', 
    ['new_category', 'add_product_to_category']);

export const categorySuggestions = pgTable("category_suggestions", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    type: categorySuggestionTypeEnum().notNull(),
    suggestedName: text(),
    existingGroupId: integer().references(() => groups.id),
    productId: integer().references(() => products.id),
    userEmail: text(),
    notes: text(),
    createdAt: timestamp().notNull().default(sql`now()`),
});