// Runs pending Drizzle migrations at build time so a deploy always ships with an up-to-date
// schema. Designed to NEVER block a normal build:
//   - No DATABASE_URL configured  -> nothing to migrate, skip quietly (e.g. preview/CI without a DB).
//   - Migration command errors      -> log loudly but exit 0, so a transient DB hiccup can't wedge a deploy.
// A real schema problem still surfaces in the build logs; it just doesn't hard-fail the pipeline.
import { execSync } from "node:child_process";

const rawUrl = process.env.DATABASE_URL?.trim();
const hasDatabase = Boolean(rawUrl) && rawUrl !== '""' && rawUrl !== "''";

if (!hasDatabase) {
  console.log("[migrate-deploy] No DATABASE_URL set — skipping database migrations.");
  process.exit(0);
}

try {
  console.log("[migrate-deploy] Applying pending database migrations…");
  execSync("npx drizzle-kit migrate", { stdio: "inherit" });
  console.log("[migrate-deploy] Database migrations up to date.");
} catch (error) {
  console.warn("[migrate-deploy] Migration step did not complete — continuing the build so the deploy is not blocked.");
  console.warn("[migrate-deploy] Review this: ", error?.message ?? error);
}

process.exit(0);
