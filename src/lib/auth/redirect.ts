const destinations =
  /^\/(today|performance|leads(?:\/[^/?#]+)?|funnel|experiments|playbook|workflows|reports|integrations|settings|dev\/gallery)(?:[?#]|$)/;
export function safeNext(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !destinations.test(value)
  )
    return "/today";
  try {
    let decoded = value;
    for (let i = 0; i < 3; i++) {
      if (/[\\\u0000-\u0020\u007f]/.test(decoded) || decoded.startsWith("//"))
        return "/today";
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    const url = new URL(value, "https://internal.invalid");
    return url.origin === "https://internal.invalid" &&
      destinations.test(url.pathname)
      ? value
      : "/today";
  } catch {
    return "/today";
  }
}
