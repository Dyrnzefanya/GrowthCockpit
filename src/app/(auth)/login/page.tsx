import { Layers3 } from "lucide-react";
import { LoginForm } from "@/components/account-forms";
import { safeNext } from "@/lib/auth/redirect";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <section className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
      <div className="flex items-center gap-3 text-primary">
        <Layers3 className="size-6" aria-hidden="true" />
        <span className="text-lg font-semibold">du anyam</span>
      </div>
      <div>
        <h1 className="text-2xl">Sign in to your workspace</h1>
        <p className="mt-2 text-muted-foreground">Performance Marketing OS</p>
      </div>
      <p className="text-muted-foreground">
        Invite-only access. Use your invited email address to receive a secure
        sign-in link.
      </p>
      {params.error && (
        <p role="alert" className="text-critical">
          This sign-in link could not be used. Request a new link.
        </p>
      )}
      <LoginForm next={safeNext(params.next)} />
    </section>
  );
}
