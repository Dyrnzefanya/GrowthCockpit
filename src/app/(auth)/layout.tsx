import type { ReactNode } from "react";
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      {children}
    </main>
  );
}
