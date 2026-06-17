import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@/db/schema";

let pool: Pool | null = null;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  pool ??= new Pool({ connectionString: withAppRuntime(process.env.DATABASE_URL) });
  return drizzle(pool, { schema });
}

function withAppRuntime(connectionString: string) {
  const url = new URL(connectionString);
  const options = url.searchParams.get("options");
  const runtimeOption = "-c app.runtime=column-management-server";
  if (!options?.includes("app.runtime=column-management-server")) {
    url.searchParams.set("options", options ? `${options} ${runtimeOption}` : runtimeOption);
  }
  return url.toString();
}
