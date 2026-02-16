import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalDb = globalThis as typeof globalThis & {
  postgresClient?: Sql;
};

const createClient = () =>
  postgres(databaseUrl, {
    prepare: false,
    connect_timeout: 15,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    max: process.env.NODE_ENV === "development" ? 5 : 10,
  });

const client = globalDb.postgresClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalDb.postgresClient = client;
}

const db = drizzle({ client, schema });

export { db };
