"use client";

import { useEffect, useState } from "react";
import { recordClientError } from "@/services/error-actions";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [correlation, setCorrelation] = useState<string | null>(
    error.digest ?? null,
  );
  useEffect(() => {
    recordClientError({
      route: "/",
      digest: error.digest ?? null,
      stack: error.stack ?? null,
    })
      .then(setCorrelation)
      .catch(() => undefined);
  }, [error]);
  return (
    <html lang="en">
      <body className="bg-background p-8 text-foreground">
        <main className="mx-auto mt-24 max-w-xl space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <p className="font-semibold text-primary">GrowthCockpit</p>
          <h1 className="text-2xl">Workspace could not load</h1>
          <p className="text-muted-foreground">
            Try again. If the problem continues, share the correlation ID.
          </p>
          {correlation && (
            <p className="break-all text-sm text-muted-foreground">
              Correlation ID: {correlation}
            </p>
          )}
          <button
            className="focus-ring rounded-md border px-4 py-2"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
