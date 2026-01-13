import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { products, shops } from "./products";


export const productIssueEnum = pgEnum('product_issue', ['incorrect_brand', 'incorrect_price', 'incorrect_image', 'incorrect_category', 'link_broken', 'link_incorrect']);

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