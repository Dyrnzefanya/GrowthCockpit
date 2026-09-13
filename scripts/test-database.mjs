import { execFile, execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";

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
    input: ["identity", "workflows", "playbook", "experiments"]
      .map((name) => readFileSync(`supabase/tests/${name}.sql`, "utf8"))
      .join("\n"),
    stdio: ["pipe", "inherit", "inherit"],
  },
);

const run = promisify(execFile);
const database = `supabase_db_${project}`;
const concurrentUser = "66666666-6666-4666-8666-666666666666";
const psql = (sql) =>
  run("docker", [
    "exec",
    database,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-Atqc",
    sql,
  ]);

await psql(
  `insert into auth.users(id,email) values ('${concurrentUser}','experiment-concurrency@example.test')`,
);
try {
  const create = `set role authenticated; select set_config('request.jwt.claims','{"sub":"${concurrentUser}","role":"authenticated"}',false); select public.create_experiment('Concurrent','Hypothesis','variable','KPI','2027-01-01','2027-01-04');`;
  await Promise.all(Array.from({ length: 20 }, () => psql(create)));
  const { stdout } = await psql(
    `select count(*) || ':' || count(distinct code) || ':' || min(code) || ':' || max(code) from public.experiments where owner_id='${concurrentUser}'`,
  );
  if (stdout.trim() !== "20:20:EXP-2027-001:EXP-2027-020")
    throw new Error(
      `TEST-5.2 concurrent code allocation failed: ${stdout.trim()}`,
    );
  console.log("TEST-5.2 concurrent code allocation: 20 unique monotonic codes");
} finally {
  await psql(
    `delete from public.experiments where owner_id='${concurrentUser}'; delete from auth.users where id='${concurrentUser}'`,
  );
}
