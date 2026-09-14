import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const secret = process.env.SUPABASE_SECRET_KEY;
const secrets = [
  secret,
  process.env.INGEST_HMAC_SECRET,
  process.env.INGEST_HMAC_SECRET_PREVIOUS,
  process.env.CRON_SECRET,
  process.env.HUBSPOT_ACCESS_TOKEN,
  process.env.HUBSPOT_WEBHOOK_SECRET,
  process.env.SLACK_WEBHOOK_URL,
].filter(Boolean);
if (!secret || !existsSync(".next/static"))
  throw new Error(
    "Build and server environment are required for the client secret check.",
  );
function check(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) check(path);
    else if (secrets.some((value) => readFileSync(path).includes(value)))
      throw new Error(`Server secret found in client artifact: ${path}`);
  }
}
check(".next/static");
console.log(
  "Supabase and configured Phase 7–9 secrets absent from browser artifacts.",
);
