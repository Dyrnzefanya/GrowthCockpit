const timezone = "Asia/Jakarta";
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function toJakartaDate(instant: Date | string): string {
  const parts = dateFormatter.formatToParts(new Date(instant));
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
// UTC is a calendar arithmetic carrier here, never a local business instant.
function calendar(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error("Invalid business date");
  const value = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(value.getTime()) ||
    value.toISOString().slice(0, 10) !== date
  )
    throw new Error("Invalid business date");
  return value;
}
export function shiftDate(date: string, days: number) {
  const value = calendar(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function jakartaWeekday(date: string) {
  return calendar(date).getUTCDay() || 7;
}
export function jakartaWeekBounds(date: string) {
  const start = shiftDate(date, 1 - jakartaWeekday(date));
  return { start, end: shiftDate(start, 6) };
}
export function jakartaMonthBounds(date: string) {
  const value = calendar(date);
  const start = `${date.slice(0, 7)}-01`;
  value.setUTCMonth(value.getUTCMonth() + 1, 0);
  return { start, end: value.toISOString().slice(0, 10) };
}
export function jakartaIsoWeek(date: string) {
  const thursday = calendar(shiftDate(date, 4 - jakartaWeekday(date)));
  const year = thursday.getUTCFullYear();
  const first = jakartaWeekBounds(`${year}-01-04`).start;
  const week =
    1 +
    Math.floor(
      (calendar(date).getTime() - calendar(first).getTime()) / 604800000,
    );
  return `${year}-W${String(week).padStart(2, "0")}`;
}
export function todayHeading(instant: Date) {
  const date = toJakartaDate(instant);
  return `${new Intl.DateTimeFormat("id-ID", { timeZone: timezone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(instant)} · ${jakartaIsoWeek(date)} · WIB`;
}
