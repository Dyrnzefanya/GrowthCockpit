import "server-only";
export const jobs = [
  {
    key: "JOB-WEEKLY-REPORT",
    label: "Generate weekly report draft",
    schedule: "30 7 * * 1 WIB",
    cadenceMinutes: 10080,
    budgetMs: 10000,
  },
  {
    key: "JOB-EVALUATE-RULES",
    label: "Evaluate decision rules",
    schedule: "0 0 * * *",
    cadenceMinutes: 1440,
    budgetMs: 29000,
  },
  {
    key: "JOB-META-INGEST",
    label: "Ingest Meta campaign metrics",
    schedule: "0 23 * * *",
    cadenceMinutes: 1440,
    budgetMs: 40000,
  },
  {
    key: "JOB-HUBSPOT-RECONCILE",
    label: "Reconcile HubSpot CRM",
    schedule: "*/30 * * * *",
    cadenceMinutes: 30,
    budgetMs: 40000,
  },
  {
    key: "JOB-RETRY-EVENTS",
    label: "Retry inbound events",
    schedule: "*/10 * * * *",
    cadenceMinutes: 10,
    budgetMs: 40000,
  },
  {
    key: "JOB-STALE-LEADS",
    label: "Evaluate stale leads",
    schedule: "0 8 * * 1-5 WIB",
    cadenceMinutes: null,
    budgetMs: 40000,
  },
  {
    key: "JOB-DATA-HEALTH",
    label: "Evaluate data health",
    schedule: "0 * * * *",
    cadenceMinutes: 60,
    budgetMs: 40000,
  },
  {
    key: "JOB-NOTIFY-DISPATCH",
    label: "Dispatch alert notifications",
    schedule: "*/5 * * * *",
    cadenceMinutes: 5,
    budgetMs: 40000,
  },
  {
    key: "JOB-RETENTION",
    label: "Apply data retention",
    schedule: "0 2 * * * WIB",
    cadenceMinutes: 1440,
    budgetMs: 10000,
  },
] as const;
export function registeredJob(key: string) {
  return jobs.find((job) => job.key === key);
}
