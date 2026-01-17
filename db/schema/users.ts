import { pgSchema, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";


export const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
    id: uuid("id").primaryKey(),
});

export const profiles = pgTable("profiles", {
    id: uuid("id").primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
    name: text().notNull(),
    email: text().notNull(),
    createdAt: timestamp().notNull().default(sql`now()`),
    updatedAt: timestamp().notNull().default(sql`now()`),
});