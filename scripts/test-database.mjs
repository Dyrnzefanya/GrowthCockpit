import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const config = readFileSync("supabase/config.toml", "utf8");
const project = config.match(/^project_id = "([^"]+)"/m)?.[1];
if (!project) throw new Error("Local Supabase project_id is missing.");
execFileSync(
  "docker",
  [
    "exec",
    "-i",
    `supabase_db_${project}`,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
  ],
  {
    input: ["identity", "workflows", "playbook"]
      .map((name) => readFileSync(`supabase/tests/${name}.sql`, "utf8"))
      .join("\n"),
    stdio: ["pipe", "inherit", "inherit"],
  },
);
