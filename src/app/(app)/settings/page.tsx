import { PageHeader, SectionCard } from "@/components/operational";
import { EmptyState } from "@/components/states";
import {
  ProfileForm,
  PreferencesForm,
  QualificationForm,
} from "@/components/account-forms";
import { requireUser } from "@/services/session";
import { readProfile, readSettings } from "@/repositories/settings";
import { can } from "@/lib/auth/can";
import { configuration } from "@/repositories/hubspot";
import { HubspotForm } from "@/components/hubspot-forms";
export default async function Settings() {
  const user = await requireUser();
  const hubspot = await configuration();
  const [profile, settings, editable] = await Promise.all([
    readProfile(user.id),
    readSettings(),
    can("settings:update"),
  ]);
  return (
    <>
      <PageHeader
        title="Settings"
        description="Your profile and workspace preferences."
      />
      {settings.warnings.length > 0 && (
        <div
          role="alert"
          className="mb-5 rounded-md border bg-attention-soft p-4 text-attention"
        >
          <p className="font-semibold">Some settings need attention</p>
          <ul>
            {settings.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard
          title="Profile & access"
          description="Invite-only workspace access. Phase 2."
        >
          {profile && editable ? (
            <ProfileForm fullName={profile.full_name} />
          ) : (
            <div role="alert" className="p-5">
              Your profile is unavailable or access is restricted. Contact your
              workspace administrator, then reload this page.
            </div>
          )}
        </SectionCard>
        <SectionCard title="Workspace preferences">
          {editable ? (
            <PreferencesForm timezone={settings.values["workspace.timezone"]} />
          ) : (
            <p className="p-5">Preferences are read-only for this account.</p>
          )}
          {settings.updatedAt && (
            <p className="px-5 pb-5 text-xs text-muted-foreground">
              Last saved:{" "}
              {new Date(settings.updatedAt).toLocaleString("en-GB", {
                timeZone: "Asia/Jakarta",
              })}{" "}
              WIB
            </p>
          )}
        </SectionCard>
        <SectionCard title="Kualifikasi lead">
          {editable ? (
            <QualificationForm values={settings.values} />
          ) : (
            <p className="p-5">Pengaturan hanya dapat dibaca.</p>
          )}
        </SectionCard>
        <SectionCard title="CRM mapping">
          {editable ? (
            <HubspotForm
              mapping={
                hubspot.mapping ? JSON.stringify(hubspot.mapping, null, 2) : ""
              }
            />
          ) : (
            <p className="p-5">Mapping hanya dapat dibaca.</p>
          )}
        </SectionCard>
        <SectionCard title="Decision thresholds">
          <EmptyState
            title="Configuration not active yet"
            description="Versioned thresholds for deterministic recommendations."
            phase={11}
          />
        </SectionCard>
      </div>
    </>
  );
}
