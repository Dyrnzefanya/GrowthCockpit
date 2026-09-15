import { jakartaDateTime, shiftDate, toJakartaDate } from "@/domain/dates";
import { retryOutcome } from "@/domain/integrations";

export const alertDefinitions = {
  decision_recommendation: {
    severity: "info",
    slack: false,
    title: "Rekomendasi keputusan",
    message: "Tinjau bukti dan tindakan di Priority actions.",
  },
  tracking_failure: {
    severity: "critical",
    slack: true,
    title: "Dugaan kegagalan tracking kampanye",
    message:
      "Spend tercatat tanpa lead CRM selama lebih dari 24 jam. Periksa pelacakan.",
    playbook: "checklist-qa-pelacakan",
  },
  meta_token_expiring: {
    severity: "warning",
    slack: true,
    title: "Token Meta mendekati kedaluwarsa",
    message: "Rotasi token read-only dan verifikasi ingest.",
  },
  meta_currency_mismatch: {
    severity: "warning",
    slack: true,
    title: "Currency performance berbeda",
    message: "Total lintas currency ditolak. Tinjau akun dan mata uang CRM.",
  },
  meta_stale: {
    severity: "warning",
    slack: true,
    title: "Data Meta melewati SLA",
    message: "Tinjau run dan lanjutkan rentang ingest yang tertunda.",
  },
  new_mql: {
    severity: "info",
    slack: true,
    title: "Inquiry baru memenuhi MQL",
    message: "Tinjau inquiry dan tetapkan tindak lanjut.",
  },
  new_sql: {
    severity: "info",
    slack: true,
    title: "Inquiry masuk tahap SQL",
    message: "Tinjau konteks CRM dan tindakan sales berikutnya.",
  },
  deal_won: {
    severity: "info",
    slack: true,
    title: "Deal ditandai Won",
    message: "Tinjau outcome dan konteks atribusi yang tersimpan.",
  },
  deal_lost: {
    severity: "info",
    slack: true,
    title: "Deal ditandai Lost",
    message: "Tinjau outcome dan alasan tindak lanjut.",
  },
  stale_lead: {
    severity: "warning",
    slack: true,
    title: "Lead melewati SLA tindak lanjut",
    message: "Periksa aktivitas terbaru dan tentukan tindak lanjut.",
    playbook: "checklist-review-mingguan",
  },
  unmapped_stage: {
    severity: "warning",
    slack: false,
    title: "Nilai CRM belum dipetakan",
    message: "Periksa konfigurasi pemetaan HubSpot.",
  },
  integration_failure: {
    severity: "critical",
    slack: true,
    title: "Integrasi gagal berulang",
    message: "Periksa run, konfigurasi, dan pemulihan integrasi.",
  },
  integration_recovered: {
    severity: "info",
    slack: true,
    title: "Integrasi kembali sehat",
    message: "Verifikasi backlog berhasil diproses.",
  },
  dead_letter: {
    severity: "critical",
    slack: true,
    title: "Event masuk dead letter",
    message: "Periksa alasan terminal dan lakukan retry manual bila aman.",
  },
  job_failure_streak: {
    severity: "critical",
    slack: true,
    title: "Job gagal tiga kali berurutan",
    message: "Periksa riwayat eksekusi dan penyebab kegagalan.",
  },
  attribution_coverage_low: {
    severity: "warning",
    slack: true,
    title: "Cakupan atribusi di bawah ambang",
    message: "Periksa parameter acquisition pada inquiry hari tersebut.",
    playbook: "checklist-qa-pelacakan",
  },
  scheduler_overdue: {
    severity: "critical",
    slack: true,
    title: "Eksekusi terjadwal terlambat",
    message: "Periksa scheduler dan jalankan job secara manual bila perlu.",
  },
  slack_delivery_failure: {
    severity: "critical",
    slack: false,
    title: "Pengiriman Slack gagal",
    message: "Periksa webhook Slack dan riwayat delivery.",
  },
} as const;

export type AlertType = keyof typeof alertDefinitions;
export type AlertSeverity = "info" | "warning" | "critical";
export type DispatchAlert = {
  id: string;
  alertKey: string;
  type: AlertType;
  severity: AlertSeverity;
  entityType: string;
  entityId: string | null;
  firstSeenAt: string;
  attempts: number;
  evidence: Record<string, unknown>;
};
export type DeliveryGroup = { alerts: DispatchAlert[]; digest: boolean };

export function nextMorning(now: Date, nextDay = false) {
  const local = jakartaDateTime(now);
  const date = shiftDate(
    toJakartaDate(now),
    nextDay || Number(local.slice(11, 13)) >= 20 ? 1 : 0,
  );
  return `${date}T00:00:00.000Z`;
}

export function planDispatch(
  rows: DispatchAlert[],
  sentToday: Set<string>,
  now: Date,
) {
  const deferred: { ids: string[]; until: string; reason: string }[] = [];
  const eligible: DispatchAlert[] = [];
  const hour = Number(jakartaDateTime(now).slice(11, 13));
  for (const row of rows) {
    const definition = alertDefinitions[row.type];
    if (!definition.slack) continue;
    else if (sentToday.has(row.alertKey))
      deferred.push({
        ids: [row.id],
        until: nextMorning(now, true),
        reason: "daily_cap",
      });
    else if (row.severity === "info" && (hour < 7 || hour >= 20))
      deferred.push({
        ids: [row.id],
        until: nextMorning(now),
        reason: "quiet_hours",
      });
    else eligible.push(row);
  }
  const byType = Map.groupBy(eligible, (row) => row.type);
  const deliveries: DeliveryGroup[] = [];
  for (const [type, alerts] of byType)
    if (type === "stale_lead" || alerts.length > 5)
      deliveries.push({ alerts, digest: true });
    else
      deliveries.push(
        ...alerts.map((alert) => ({ alerts: [alert], digest: false })),
      );
  return { deferred, deliveries };
}

export function deliveryFailure(
  code: string,
  currentAttempts: number,
  maxAttempts: number,
  now: number,
  random: number,
) {
  const outcome = retryOutcome(
    code,
    currentAttempts + 1,
    maxAttempts,
    now,
    random,
  );
  return { terminal: outcome.status !== "failed", next: outcome.next };
}

export function scheduledJobOverdue(
  lastRunAt: string | null,
  now: Date,
  cadenceMinutes: number,
) {
  return (
    !lastRunAt ||
    now.getTime() - Date.parse(lastRunAt) > cadenceMinutes * 120000
  );
}

export function weekdayJobOverdue(lastRunAt: string | null, now: Date) {
  const localDate = toJakartaDate(now);
  const hour = Number(jakartaDateTime(now).slice(11, 13));
  let latest = hour >= 8 ? localDate : shiftDate(localDate, -1);
  while ([6, 7].includes(new Date(`${latest}T00:00:00Z`).getUTCDay() || 7))
    latest = shiftDate(latest, -1);
  let previous = shiftDate(latest, -1);
  while ([6, 7].includes(new Date(`${previous}T00:00:00Z`).getUTCDay() || 7))
    previous = shiftDate(previous, -1);
  const boundary = Date.parse(`${previous}T01:00:00.000Z`);
  return !lastRunAt || Date.parse(lastRunAt) < boundary;
}
