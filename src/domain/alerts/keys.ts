export function alertKey(type: string, ...identifiers: string[]) {
  const parts = [type, ...identifiers].map((value) =>
    encodeURIComponent(value.trim().toLowerCase()),
  );
  const key = parts.join(":");
  if (!identifiers.length || parts.some((part) => !part) || key.length > 300)
    throw new Error("INVALID_ALERT_KEY");
  return key;
}
