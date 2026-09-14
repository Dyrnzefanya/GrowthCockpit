const retryable = new Set([
  "INTERNAL",
  "UPSTREAM_UNAVAILABLE",
  "UPSTREAM_RATE_LIMITED",
  "NETWORK",
  "TIMEOUT",
]);
export function errorCode(error: unknown) {
  if (error instanceof TypeError) return "NETWORK";
  const code = error instanceof Error ? error.message : "INTERNAL";
  return [
    ...retryable,
    "VALIDATION_FAILED",
    "UNAUTHENTICATED",
    "FORBIDDEN",
    "NOT_FOUND",
    "CONFLICT",
    "BUSINESS_RULE_REJECTED",
    "STALE_CLAIM",
    "MAPPING_INVALID",
    "NOT_CONFIGURED",
  ].includes(code)
    ? code
    : "INTERNAL";
}
export function retryOutcome(
  code: string,
  attempts: number,
  max: number,
  now: number,
  random: number,
) {
  if (!retryable.has(code)) return { status: "rejected" as const, next: null };
  if (attempts >= max) return { status: "dead_letter" as const, next: null };
  const cap = [60, 300, 1500, 7200, 21600][
    Math.min(Math.max(attempts - 1, 0), 4)
  ];
  return {
    status: "failed" as const,
    next: new Date(
      now + Math.floor(Math.max(0, Math.min(random, 1)) * cap * 1000),
    ).toISOString(),
  };
}
export function integrationHealth(
  configured: boolean,
  lastSuccess: string | null,
  failures: number,
  partial: boolean,
  slaMs: number,
  now: number,
) {
  if (!configured) return "not_configured" as const;
  const age = lastSuccess ? now - Date.parse(lastSuccess) : Infinity;
  if (failures >= 3 || age > slaMs * 2) return "failing" as const;
  if (failures > 0 || partial || age > slaMs) return "degraded" as const;
  return "healthy" as const;
}
