import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!secret || !existsSync(".next/static"))
  throw new Error(
    "Build and server environment are required for the client secret check.",
  );
function check(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) check(path);
    else if (readFileSync(path).includes(secret))
      throw new Error(`Server secret found in client artifact: ${path}`);
  }
}
check(".next/static");
console.log("TEST-2.6: service-role key absent from browser artifacts.");
