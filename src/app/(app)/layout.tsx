import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { serverEnv } from "@/lib/env.server";
import { requireUser } from "@/services/session";
export default async function ApplicationLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();
  return <AppShell environment={serverEnv.APP_ENV}>{children}</AppShell>;
}
