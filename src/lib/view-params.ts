const datePattern = /^\d{4}-\d{2}-\d{2}$/;
export function validDate(value: string | null): string {
  if (!value || !datePattern.test(value)) return "";
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
    ? value
    : "";
}
export function readViewParams(params: URLSearchParams) {
  const start = validDate(params.get("from"));
  const end = validDate(params.get("to"));
  const validRange = !start || !end || start <= end;
  return {
    query: (params.get("q") ?? "").slice(0, 120),
    from: validRange ? start : "",
    to: validRange ? end : "",
  };
}
