"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { alertAction } from "@/services/alert-actions";

export function AlertControls({ id }: { id: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (previous: { message: string; success: boolean }, form: FormData) => {
      const result = await alertAction(previous, form);
      toast(result.message);
      router.refresh();
      return result;
    },
    { message: "", success: false },
  );
  if (state.success) return null;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <Button
        name="operation"
        value="acknowledge"
        type="submit"
        variant="outline"
        disabled={pending}
      >
        Acknowledge
      </Button>
      <label className="field text-xs">
        Snooze
        <select className="native-control" name="minutes" defaultValue="60">
          <option value="60">1 jam</option>
          <option value="240">4 jam</option>
          <option value="1440">1 hari</option>
        </select>
      </label>
      <Button
        name="operation"
        value="snooze"
        type="submit"
        variant="outline"
        disabled={pending}
      >
        Snooze
      </Button>
      <span className="sr-only" role="status">
        {state.message}
      </span>
    </form>
  );
}
