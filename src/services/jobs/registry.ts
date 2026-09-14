import "server-only";
export const jobs = [
  {
    key: "JOB-HUBSPOT-RECONCILE",
    label: "Reconcile HubSpot CRM",
    schedule: "*/30 * * * *",
    budgetMs: 40000,
  },
  {
    key: "JOB-RETRY-EVENTS",
    label: "Retry inbound events",
    schedule: "*/10 * * * *",
    budgetMs: 40000,
  },
] as const;
export function registeredJob(key: string) {
  return jobs.find((job) => job.key === key);
}
