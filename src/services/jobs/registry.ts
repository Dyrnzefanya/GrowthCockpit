import "server-only";
export const jobs = [
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
] as const;
export function registeredJob(key: string) {
  return jobs.find((job) => job.key === key);
}
