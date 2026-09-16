import "server-only";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/server-admin";
import {
  providerIdSchema,
  type ProviderId,
} from "@/domain/integration-providers";
import type { Json } from "@/types/database.generated";

const storedRowSchema = z.object({
  provider: providerIdSchema.extract(["meta", "hubspot"]),
  config: z.record(z.string(), z.unknown()),
  secret_refs: z.record(z.string(), z.string()),
  provider_identity: z.record(z.string(), z.unknown()),
  configured_at: z.string().nullable(),
  credentials_updated_at: z.string().nullable(),
  last_verified_at: z.string().nullable(),
  last_error_code: z.string().nullable(),
  disconnected_at: z.string().nullable(),
});

export type StoredProviderSummary = Omit<
  z.infer<typeof storedRowSchema>,
  "secret_refs"
> & { secretKeys: string[] };

export async function providerSummaries(): Promise<StoredProviderSummary[]> {
  const { data, error } = await adminClient()
    .from("integration_provider_configs")
    .select(
      "provider,config,secret_refs,provider_identity,configured_at,credentials_updated_at,last_verified_at,last_error_code,disconnected_at",
    );
  if (error) throw new Error("INTEGRATION_CONFIG_UNAVAILABLE");
  return storedRowSchema
    .array()
    .parse(data)
    .map(({ secret_refs, ...row }) => ({
      ...row,
      secretKeys: Object.keys(secret_refs),
    }));
}

const resolvedSchema = z.object({
  config: z.record(z.string(), z.unknown()),
  secrets: z.record(z.string(), z.unknown()),
});

export async function resolvedProvider(provider: "meta" | "hubspot") {
  const { data, error } = await adminClient().rpc(
    "resolve_integration_provider",
    { p_provider: provider },
  );
  if (error) throw new Error("CREDENTIAL_UNAVAILABLE");
  return data === null ? null : resolvedSchema.parse(data);
}

export async function saveProvider(input: {
  provider: "meta" | "hubspot";
  config: Record<string, string>;
  secrets: Record<string, string>;
  actor: string;
  correlation: string;
}) {
  const { error } = await adminClient().rpc("save_integration_provider", {
    p_provider: input.provider,
    p_config: input.config as Json,
    p_secrets: input.secrets as Json,
    p_actor: input.actor,
    p_correlation: input.correlation,
  });
  if (error) throw new Error("CREDENTIAL_SAVE_FAILED");
}

export async function recordVerification(input: {
  provider: "meta" | "hubspot";
  success: boolean;
  identity: Record<string, Json | undefined>;
  error: string | null;
  actor: string;
  correlation: string;
}) {
  const identity = Object.fromEntries(
    Object.entries(input.identity).filter((entry) => entry[1] !== undefined),
  ) as Json;
  const { error } = await adminClient().rpc("record_integration_verification", {
    p_provider: input.provider,
    p_success: input.success,
    p_identity: identity,
    p_error: input.error!,
    p_actor: input.actor,
    p_correlation: input.correlation,
  });
  if (error) throw new Error("VERIFICATION_AUDIT_FAILED");
}

export async function removeProvider(
  provider: "meta" | "hubspot",
  actor: string,
  correlation: string,
) {
  const { error } = await adminClient().rpc("remove_integration_provider", {
    p_provider: provider,
    p_actor: actor,
    p_correlation: correlation,
  });
  if (error) throw new Error("CREDENTIAL_REMOVE_FAILED");
}

export function functionalProvider(id: ProviderId): id is "meta" | "hubspot" {
  return id === "meta" || id === "hubspot";
}
