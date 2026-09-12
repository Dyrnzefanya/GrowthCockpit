import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const output = execFileSync(
  process.execPath,
  [
    "node_modules/supabase/dist/supabase.js",
    "gen",
    "types",
    "typescript",
    "--local",
  ],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
// Write only after successful generation, consistently across Windows and CI.
writeFileSync("src/types/database.generated.ts", output.trimEnd() + "\n");
