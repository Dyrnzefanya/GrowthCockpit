"use client";
import { useActionState } from "react";
import {
  saveDecisionThreshold,
  decisionAction,
} from "@/services/decision-actions";
import { Button } from "@/components/ui/button";
export function ThresholdForm({
  name,
  value,
  label,
  help,
}: {
  name: string;
  value: string;
  label: string;
  help: string;
}) {
  const [message, action, pending] = useActionState(saveDecisionThreshold, "");
  return (
    <form action={action} className="space-y-2 border-b p-5">
      <input type="hidden" name="key" value={name} />
      <label className="field" htmlFor={name}>
        {label}
        <input
          id={name}
          key={value}
          name="value"
          className="native-control"
          defaultValue={value}
          aria-describedby={`${name}-help`}
        />
      </label>
      <p id={`${name}-help`} className="text-xs text-muted-foreground">
        {help}
      </p>
      <div className="flex gap-3">
        <Button disabled={pending} name="operation" value="save">
          Simpan
        </Button>
        <Button
          disabled={pending}
          variant="outline"
          name="operation"
          value="reset"
        >
          Reset default
        </Button>
      </div>
      <p role="status" className="text-sm">
        {message}
      </p>
    </form>
  );
}
export function DecisionControls({
  id,
  revision,
}: {
  id: string;
  revision: string;
}) {
  const [message, action, pending] = useActionState(decisionAction, "");
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      <div className="flex flex-wrap gap-3">
        <label className="field" htmlFor={`duration-${id}`}>
          Tunda selama
          <select
            id={`duration-${id}`}
            className="native-control"
            name="minutes"
            defaultValue="1440"
          >
            <option value="60">1 jam</option>
            <option value="1440">1 hari</option>
            <option value="10080">7 hari</option>
          </select>
        </label>
        <Button
          name="operation"
          value="snooze"
          disabled={pending}
          variant="outline"
        >
          Snooze
        </Button>
      </div>
      <label className="field" htmlFor={`reason-${id}`}>
        Alasan dismiss
        <input
          id={`reason-${id}`}
          className="native-control"
          name="reason"
          maxLength={200}
        />
      </label>
      <Button
        name="operation"
        value="dismiss"
        disabled={pending}
        variant="outline"
      >
        Dismiss sampai besok
      </Button>
      <p role="status" className="text-sm">
        {message}
      </p>
    </form>
  );
}
