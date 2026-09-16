"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/services/session";
import { scrubLogValue } from "@/domain/security/logs";

const inputSchema = z.object({
  route: z.string().regex(/^\/[A-Za-z0-9/_?&=.-]{0,300}$/),
  digest: z.string().max(200).nullable(),
  stack: z.string().max(10000).nullable(),
});

export async function recordClientError(input: unknown) {
  await requireUser();
  const value = inputSchema.parse(input);
  const correlation = randomUUID();
  console.error(
    JSON.stringify({
      correlation_id: correlation,
      route: value.route.split("?")[0],
      outcome: "client_error",
      digest: value.digest,
      component_stack: scrubLogValue(value.stack),
    }),
  );
  return correlation;
}
