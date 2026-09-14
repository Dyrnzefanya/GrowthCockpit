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
    input: [
      "identity",
      "workflows",
      "playbook",
      "experiments",
      "leads",
      "integrations",
      "hubspot",
      "alerts",
    ]
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

const phase7Key = "phase7-concurrency-fixture";
try {
  const attempts = await Promise.all(
    Array.from({ length: 10 }, () =>
      psql(
        `select coalesce(public.start_job('${phase7Key}','manual',gen_random_uuid())::text,'busy')`,
      ),
    ),
  );
  if (attempts.filter((r) => r.stdout.trim() !== "busy").length !== 1)
    throw new Error("Phase 7 concurrent job acquisition failed");
  console.log("Phase 7 concurrency: one job acquired; nine rejected");
} finally {
  await psql(
    `delete from public.integration_runs where job_key='${phase7Key}'; delete from public.sync_state where resource='${phase7Key}';`,
  );
}

const alertKey = "phase9:concurrency-fixture";
try {
  await Promise.all(
    Array.from({ length: 10 }, () =>
      psql(
        `select public.raise_alert(jsonb_build_object('alert_key','${alertKey}','type','new_mql','severity','info','source','test','entity_type','lead','entity_id',gen_random_uuid(),'title','Test','message','Safe','evidence','{}'::jsonb,'notify',true,'detected_at',now()));`,
      ),
    ),
  );
  const result = (
    await psql(
      `select count(*) || ':' || max(occurrence_count) from public.alerts where alert_key='${alertKey}'`,
    )
  ).stdout.trim();
  if (result !== "1:10")
    throw new Error(`Phase 9 alert dedupe failed: ${result}`);
  console.log("TEST-9.2 concurrent alert raise: one row, ten occurrences");
} finally {
  await psql(`delete from public.alerts where alert_key='${alertKey}'`);
}

const crmScope = JSON.stringify({
  emails: [],
  phones: [],
  domains: ["crm-concurrency.example.test"],
  names: [],
  keys: [],
});
const revision = (
  await psql(`select public.crm_snapshot('${crmScope}') ->> 'revision'`)
).stdout.trim();
try {
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, (_, n) =>
      psql(`select public.commit_lead_batch('${crmScope}','${revision}',jsonb_build_object(
    'companies',jsonb_build_array(jsonb_build_object('id','88888888-8888-4888-8888-${String(n + 1).padStart(12, "0")}','name','Concurrency fixture','name_key','concurrency fixture','domain','crm-concurrency.example.test','created_at',now(),'updated_at',now(),'source_system','manual')),
    'contacts','[]'::jsonb,'leads','[]'::jsonb,'duplicates','[]'::jsonb,'events','[]'::jsonb));`),
    ),
  );
  if (results.filter((r) => r.status === "fulfilled").length !== 1)
    throw new Error("Phase 6 snapshot concurrency gate failed");
  if (
    (
      await psql(
        "select count(*) from public.companies where domain='crm-concurrency.example.test'",
      )
    ).stdout.trim() !== "1"
  )
    throw new Error("Concurrent CRM write duplicated identity");
  console.log(
    "Phase 6 concurrent snapshot: one commit, four stale writers rejected",
  );
} finally {
  await psql(
    "delete from public.companies where domain='crm-concurrency.example.test'",
  );
}

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
