import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const databaseArgs = process.env.LOCAL_DATABASE_URL
  ? ["--db-url", process.env.LOCAL_DATABASE_URL]
  : ["--local"];
const output = execFileSync(
  process.execPath,
  [
    "node_modules/supabase/dist/supabase.js",
    "gen",
    "types",
    "typescript",
    ...databaseArgs,
  ],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
// Write only after successful generation, consistently across Windows and CI.
writeFileSync("src/types/database.generated.ts", output.trimEnd() + "\n");
