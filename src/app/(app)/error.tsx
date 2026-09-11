"use client";
import { ErrorState } from "@/components/states";
export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}
