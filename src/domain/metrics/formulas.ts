type Metric = number | null | undefined;
export function ratio(n: Metric, d: Metric, scale = 1): number | null {
  if (
    n == null ||
    d == null ||
    !Number.isFinite(n) ||
    !Number.isFinite(d) ||
    d <= 0
  )
    return null;
  const result = (n / d) * scale;
  return Number.isFinite(result) ? result : null;
}
export const cpm = (spend: Metric, impressions: Metric) =>
  ratio(spend, impressions, 1000);
export const ctr = ratio;
export const cpc = ratio;
export const cpl = ratio;
export const mqlRate = ratio;
export const cpql = ratio;
export const sqlRate = ratio;
export const cpsql = ratio;
export const quotationRate = ratio;
export const cac = ratio;
export const roas = ratio;
export const attributionCoverage = ratio;
export const outcomeCompleteness = ratio;
export function winRate(won: Metric, lost: Metric) {
  return won == null || lost == null ? null : ratio(won, won + lost);
}
export function reported(value: Metric) {
  return value == null || !Number.isFinite(value) ? null : value;
}
export const frequency = reported;
export function sum(values: Metric[]) {
  return values.some((v) => v == null || !Number.isFinite(v))
    ? null
    : values.reduce<number>((total, v) => total + v!, 0);
}
// Decimal strings keep numeric(18,2) values exact without binary floating point money.
export function minorUnits(value: string): bigint {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error("VALIDATION_FAILED");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
export function decimal(units: bigint) {
  return `${units / 100n}.${(units % 100n).toString().padStart(2, "0")}`;
}
export function revenue(rows: { amount: string | null; currency: string }[]) {
  if (!rows.length) return { amount: "0.00", currency: "IDR" };
  if (
    rows.some((r) => r.amount === null) ||
    new Set(rows.map((r) => r.currency)).size !== 1
  )
    return null;
  return {
    amount: decimal(rows.reduce((n, r) => n + minorUnits(r.amount!), 0n)),
    currency: rows[0].currency,
  };
}
