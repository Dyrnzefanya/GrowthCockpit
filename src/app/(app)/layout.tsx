import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { serverEnv } from "@/lib/env.server";
export default function ApplicationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AppShell environment={serverEnv.APP_ENV}>{children}</AppShell>;
}
