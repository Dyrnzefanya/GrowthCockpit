"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge, type Status } from "@/components/status-badge";
import type { IntegrationCenterProvider } from "@/services/integration-center";
import {
  integrationCenterAction,
  type IntegrationActionState,
} from "@/services/integration-center-actions";

const stateSemantics: Record<IntegrationCenterProvider["state"], Status> = {
  AVAILABLE_NOT_CONFIGURED: "not_configured",
  CONFIGURED_UNVERIFIED: "pending",
  CONNECTED: "healthy",
  ERROR: "critical",
  DISCONNECTED: "unknown",
  COMING_SOON: "info",
};
const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Jakarta" }) +
      " WIB"
    : "Never";

function ProviderCard({ provider }: { provider: IntegrationCenterProvider }) {
  const [state, action, pending] = useActionState<
    IntegrationActionState,
    FormData
  >(integrationCenterAction, { message: "" });
  const comingSoon = provider.state === "COMING_SOON";
  return (
    <article className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
        <div className="max-w-prose">
          <h2 className="text-base">{provider.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {provider.description}
          </p>
        </div>
        <StatusBadge
          status={stateSemantics[provider.state]}
          label={provider.state.replaceAll("_", " ")}
        />
      </header>
      <div className="space-y-5 p-5">
        {comingSoon ? (
          <p className="text-sm">
            Credentials, connection tests, and sync are unavailable until this
            provider is implemented.
          </p>
        ) : (
          <>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Configuration source</dt>
                <dd>
                  {provider.source === "settings"
                    ? "GrowthCockpit Settings"
                    : provider.source === "environment"
                      ? "Server Environment"
                      : "Not configured"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last verified</dt>
                <dd>{date(provider.lastVerifiedAt)}</dd>
              </div>
              {provider.identity.map((item) => (
                <div key={item.label}>
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="break-all">{item.value}</dd>
                </div>
              ))}
              {provider.lastErrorCode && (
                <div>
                  <dt className="text-muted-foreground">Safe error</dt>
                  <dd>{provider.lastErrorCode}</dd>
                </div>
              )}
            </dl>
            {provider.editable ? (
              <form action={action} className="space-y-4">
                <input type="hidden" name="provider" value={provider.id} />
                <fieldset
                  className="grid gap-4 sm:grid-cols-2"
                  disabled={pending}
                >
                  <legend className="sr-only">Configure {provider.name}</legend>
                  {provider.fields.map((field) => (
                    <label className="field" key={field.key}>
                      {field.label}
                      <input
                        key={`${field.key}-${provider.credentialsUpdatedAt ?? "unset"}`}
                        className="native-control"
                        name={field.key}
                        type={field.kind === "secret" ? "password" : "text"}
                        inputMode={field.inputMode}
                        autoComplete="off"
                        defaultValue={field.defaultValue}
                        placeholder={
                          field.kind === "secret" && field.configured
                            ? "Configured — enter a new value to replace"
                            : undefined
                        }
                        required={field.kind === "config" || !field.configured}
                      />
                      {field.kind === "secret" && field.configured && (
                        <span className="text-xs text-muted-foreground">
                          •••••••••••••••• Configured. Existing value is never
                          returned.
                        </span>
                      )}
                    </label>
                  ))}
                </fieldset>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={pending} name="operation" value="save">
                    {provider.settingsManaged
                      ? "Replace configuration"
                      : "Save configuration"}
                  </Button>
                  <Button
                    disabled={pending || provider.source === "none"}
                    name="operation"
                    value="test"
                    variant="outline"
                  >
                    Test Connection
                  </Button>
                  {provider.settingsManaged && (
                    <Button
                      disabled={pending}
                      name="operation"
                      value="remove"
                      variant="destructive"
                      onClick={(event) => {
                        if (
                          !window.confirm(
                            `Remove the Settings-managed ${provider.name} credential?`,
                          )
                        )
                          event.preventDefault();
                      }}
                    >
                      Disconnect Settings credential
                    </Button>
                  )}
                </div>
              </form>
            ) : (
              <p className="text-sm">
                Credential management requires owner access.
              </p>
            )}
            {provider.settingsManaged &&
              provider.environmentFallbackAvailable && (
                <p className="text-xs text-muted-foreground">
                  Removing this Settings credential returns the provider to its
                  server environment configuration.
                </p>
              )}
            <p className="text-xs text-muted-foreground">
              Credential updated: {date(provider.credentialsUpdatedAt)}
            </p>
            {provider.id === "meta" && provider.source !== "none" && (
              <Button asChild variant="outline">
                <Link href="/integrations">Open ingest controls</Link>
              </Button>
            )}
            {provider.id === "hubspot" && provider.source !== "none" && (
              <Button asChild variant="outline">
                <Link href="/integrations/hubspot">Open sync controls</Link>
              </Button>
            )}
          </>
        )}
        <p aria-live="polite" className="text-sm" role="status">
          {state.message}
          {state.correlationId ? ` Reference: ${state.correlationId}` : ""}
        </p>
      </div>
    </article>
  );
}

export function IntegrationCenter({
  providers,
}: {
  providers: IntegrationCenterProvider[];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {providers.map((provider) => (
        <ProviderCard provider={provider} key={provider.id} />
      ))}
    </div>
  );
}
