"use client";
import { useActionState, useState } from "react";
import {
  sendLoginLink,
  saveProfile,
  savePreferences,
} from "@/services/account";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
