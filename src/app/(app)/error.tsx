"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ErrorState } from "@/components/states";
import { recordClientError } from "@/services/error-actions";
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const path = usePathname();
  const [correlation, setCorrelation] = useState<string | null>(
    error.digest ?? null,
  );
  useEffect(() => {
    recordClientError({
      route: path,
      digest: error.digest ?? null,
      stack: error.stack ?? null,
    })
      .then(setCorrelation)
      .catch(() => undefined);
  }, [error, path]);
  return <ErrorState onRetry={reset} correlation={correlation} />;
}
