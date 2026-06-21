import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@/db/schema";

let pool: Pool | null = null;
if (!process.env.VERCEL) {
  neonConfig.webSocketConstructor ??= ws;
}

function configuredDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url === "\"\"" || url === "''") return "";
  return url;
}

function databaseUrl() {
  const url = configuredDatabaseUrl();
  if (!url) return "";

  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("-pooler.")) {
      parsed.hostname = parsed.hostname.replace("-pooler.", ".");
      return parsed.toString();
    }
  } catch {
    return url.replace("-pooler.", ".");
  }

  return url;
}

export function hasDatabase() {
  return Boolean(configuredDatabaseUrl());
}

export function getDb() {
  if (!configuredDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  pool ??= new Pool({
    connectionString: databaseUrl(),
    options: "-c app.runtime=column-management-server"
  });
  return drizzle(pool, { schema });
}
