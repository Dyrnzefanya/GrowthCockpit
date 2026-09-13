import { jakartaWeekday, shiftDate, toJakartaDate } from "@/domain/dates";
export const duplicateWindowMs = 24 * 60 * 60 * 1000;
export function previousMatch(observations: string[], timestamp: string) {
  const time = Date.parse(timestamp);
  return observations.some(
    (previous) =>
      time >= Date.parse(previous) &&
      time - Date.parse(previous) <= duplicateWindowMs,
  );
}
export function resolveContact<
  T extends { id: string; email: string | null; phone_e164: string | null },
>(rows: T[], email: string | null, phone: string | null) {
  const mail = email ? rows.find((r) => r.email === email) : undefined;
  const tel = phone ? rows.find((r) => r.phone_e164 === phone) : undefined;
  if (mail && tel && mail.id !== tel.id) throw new Error("CONFLICT");
  return mail ?? tel ?? null;
}
export function resolveCompany<
  T extends { id: string; domain: string | null; name_key: string },
>(rows: T[], domain: string | null, name: string) {
  const byDomain = domain ? rows.find((r) => r.domain === domain) : undefined;
  if (byDomain) return byDomain;
  const matches = name ? rows.filter((r) => r.name_key === name) : [];
  if (
    matches.length > 1 ||
    (domain && matches[0]?.domain && matches[0].domain !== domain)
  )
    throw new Error("CONFLICT");
  return matches[0] ?? null;
}
export function workdaysSince(instant: string, today: string) {
  let date = toJakartaDate(instant),
    count = 0;
  while (date < today) {
    date = shiftDate(date, 1);
    if (jakartaWeekday(date) <= 5) count++;
  }
  return count;
}
export function followUp(
  input: { status: string; attributionMissing: boolean; lastEvent: string },
  today: string,
  mqlDays: number,
  sqlDays: number,
) {
  const reasons: string[] = [];
  if (input.status === "new") reasons.push("Perlu review kualifikasi");
  if (input.attributionMissing) reasons.push("Atribusi belum lengkap");
  if (
    ["mql", "sql"].includes(input.status) &&
    workdaysSince(input.lastEvent, today) >
      (input.status === "mql" ? mqlDays : sqlDays)
  )
    reasons.push("Lewat SLA tindak lanjut");
  return reasons;
}
