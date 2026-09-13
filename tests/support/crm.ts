import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import "./environment";
export async function cleanupLeads(ids: string[]) {
  if (!ids.length) return;
  if (ids.some((id) => !/^[0-9a-f-]{36}$/.test(id)))
    throw new Error("Invalid fixture id");
  const project = readFileSync("supabase/config.toml", "utf8").match(
    /^project_id = "([^"]+)"/m,
  )![1];
  const quoted = (values: string[]) =>
    values.map((v) => "'" + v + "'").join(",");
  // Local superuser cleanup only: product roles cannot disable append-only history.
  const sql = `begin; set local session_replication_role=replica;
 create temp table fixture_leads on commit drop as select id,contact_id,company_id from public.leads where id in (${quoted(ids)});
 delete from public.lead_stage_events where lead_id in (${quoted(ids)});
 delete from public.deals where lead_id in (${quoted(ids)});
 delete from public.leads where id in (${quoted(ids)});
 delete from public.contacts where id in (select contact_id from fixture_leads) and not exists(select 1 from public.leads where contact_id=contacts.id);
 delete from public.companies where id in (select company_id from fixture_leads) and not exists(select 1 from public.contacts where company_id=companies.id) and not exists(select 1 from public.leads where company_id=companies.id);
 commit;`;
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_" + project,
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: sql, stdio: ["pipe", "pipe", "pipe"] },
  );
}
