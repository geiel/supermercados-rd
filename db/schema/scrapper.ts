import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { shops } from "./products";

export const scrapperHeaders = pgTable("scrapper_headers", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer()
    .notNull()
    .references(() => shops.id),
  name: text().notNull(),
  value: text().notNull(),
});
