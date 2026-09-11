import Link from "next/link";
import { Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function Login() {
  return (
    <section className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
      <div className="flex items-center gap-3 text-primary">
        <Layers3 className="size-6" aria-hidden="true" />
        <span className="text-lg font-semibold">du anyam</span>
      </div>
      <div>
        <h1 className="text-2xl">Welcome to your workspace</h1>
        <p className="mt-2 text-muted-foreground">Performance Marketing OS</p>
      </div>
      <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
        Sign-in is not active yet. Account access will be available in Phase 2.
      </p>
      <div className="space-y-4">
        <label className="field" htmlFor="email">
          Email
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@duanyam.com"
            disabled
          />
        </label>
        <label className="field" htmlFor="password">
          Password
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            disabled
          />
        </label>
        <Button className="w-full" disabled>
          Sign in
        </Button>
      </div>
      <Link
        href="/today"
        className="block text-sm font-medium text-primary underline underline-offset-4"
      >
        Explore the workspace structure
      </Link>
    </section>
  );
}
