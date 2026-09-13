"use client";
import { useActionState, useState } from "react";
import {
  sendLoginLink,
  saveProfile,
  savePreferences,
  saveQualification,
} from "@/services/account";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  qualificationKeys,
  type settingsDefaults,
} from "@/config/settings-schema";
function QualificationField({
  name,
  value,
}: {
  name: (typeof qualificationKeys)[number];
  value: number | string[];
}) {
  const [message, action, pending] = useActionState(saveQualification, "");
  const labels = {
    "qualification.min_quantity": "Minimum jumlah untuk Q_SIZE",
    "qualification.free_email_domains": "Domain email gratis",
    "qualification.internal_domains": "Domain internal (DQ_TEST)",
    "qualification.competitor_domains": "Domain kompetitor (DQ_COMPETITOR)",
  };
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="key" value={name} />
      <label className="field" htmlFor={name}>
        {labels[name]}
        {typeof value === "number" ? (
          <input
            className="native-control"
            id={name}
            name="value"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={value}
          />
        ) : (
          <textarea
            className="native-control min-h-24"
            id={name}
            name="value"
            defaultValue={value.join("\n")}
            maxLength={128000}
          />
        )}
      </label>
      <Button disabled={pending} variant="outline">
        Simpan {labels[name]}
      </Button>
      <p role="status" className="text-sm">
        {message}
      </p>
    </form>
  );
}
export function QualificationForm({
  values,
}: {
  values: typeof settingsDefaults;
}) {
  return (
    <div className="space-y-5 p-5">
      <p className="text-sm text-muted-foreground">
        q1 · Perubahan hanya untuk inquiry baru. Domain: satu per baris, tanpa
        https://. Daftar kosong tidak mencocokkan domain apa pun.
      </p>
      {qualificationKeys.map((name) => (
        <QualificationField key={name} name={name} value={values[name]} />
      ))}
    </div>
  );
}
export function LoginForm({ next }: { next: string }) {
  const [message, action, pending] = useActionState(sendLoginLink, "");
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="field" htmlFor="email">
        Email
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <Button className="w-full" disabled={pending}>
        {pending ? "Requesting link…" : "Email sign-in link"}
      </Button>
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
    </form>
  );
}
export function ProfileForm({ fullName }: { fullName: string }) {
  const [message, action, pending] = useActionState(saveProfile, "");
  const [name, setName] = useState(fullName);
  return (
    <form action={action} className="space-y-4 p-5">
      <label className="field" htmlFor="full-name">
        Full name
        <Input
          id="full-name"
          name="full_name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={120}
        />
      </label>
      <Button disabled={pending}>Save profile</Button>
      <p role="status">{message}</p>
    </form>
  );
}
export function PreferencesForm({ timezone }: { timezone: string }) {
  const [message, action, pending] = useActionState(savePreferences, "");
  return (
    <form action={action} className="space-y-4 p-5">
      <label className="field" htmlFor="timezone">
        Business timezone
        <select
          id="timezone"
          name="timezone"
          defaultValue={timezone}
          className="native-control"
        >
          <option value="Asia/Jakarta">Asia/Jakarta · WIB</option>
        </select>
      </label>
      <p className="text-sm text-muted-foreground">
        All business dates use Asia/Jakarta. The workspace timezone is fixed.
      </p>
      <Button disabled={pending}>Save preferences</Button>
      <p role="status">{message}</p>
    </form>
  );
}
