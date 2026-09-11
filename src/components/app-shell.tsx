"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  ChevronRight,
  Menu,
  Layers3,
  PanelLeftClose,
} from "lucide-react";
import { navigation, navigationFor } from "@/config/navigation";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

function Brand() {
  return (
    <Link
      href="/today"
      className="flex items-center gap-3 text-rail-foreground"
    >
      <span className="flex size-9 items-center justify-center rounded-md border border-rail-muted/30">
        <Layers3 className="size-5" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-base font-semibold tracking-tight">
          du anyam
        </span>
        <span className="block text-xs text-rail-muted">
          Performance Marketing
          <span className="block">Operating System</span>
        </span>
      </span>
    </Link>
  );
}
export function AppShell({
  children,
  environment,
}: {
  children: ReactNode;
  environment: "development" | "preview" | "production";
}) {
  const path = usePathname();
  const active = navigationFor(path);
  const [open, setOpen] = useState(false);
  const label =
    environment === "production"
      ? "PROD"
      : environment === "preview"
        ? "PREVIEW"
        : "DEV";
  const nav = (
    <nav aria-label="Primary navigation" className="space-y-4">
      {["Workspace", "Operations", "Administration"].map((group) => (
        <div key={group}>
          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-rail-muted">
            {group}
          </p>
          <ul className="space-y-0.5">
            {navigation
              .filter((item) => item.group === group)
              .map((item) => (
                <li key={item.href}>
                  <Link
                    className="nav-link"
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={
                      active?.href === item.href ? "page" : undefined
                    }
                  >
                    <item.icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  );
  return (
    <div className="workspace">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="px-6 py-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6">{nav}</div>
        <div className="space-y-3 border-t border-rail-muted/20 p-5">
          <div className="text-xs text-rail-muted">
            Internal workspace
            <span className="mt-1 block">Asia/Jakarta · WIB</span>
          </div>
          {environment === "development" && (
            <Link
              href="/dev/gallery"
              className="flex items-center justify-between text-xs text-rail-foreground"
            >
              Component gallery
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </aside>
      <div className="workspace-body">
        <header className="border-b bg-card">
          <div className="flex min-h-14 flex-wrap items-center justify-between gap-4 px-5 py-2 lg:px-8">
            <div className="flex items-center gap-3">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Open navigation"
                  >
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-80 max-w-full overflow-y-auto bg-rail text-rail-foreground"
                >
                  <div className="px-5 pt-6 pr-16">
                    <SheetTitle className="text-rail-foreground">
                      Navigation
                    </SheetTitle>
                    <SheetDescription className="text-rail-muted">
                      Du Anyam Performance Marketing OS
                    </SheetDescription>
                  </div>
                  <div className="px-3 pb-6">{nav}</div>
                </SheetContent>
              </Sheet>
              <PanelLeftClose
                className="hidden size-4 text-muted-foreground lg:block"
                aria-hidden="true"
              />
              <nav aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-xs text-muted-foreground">
                  <li>
                    <Link href="/today">Workspace</Link>
                  </li>
                  <li>
                    <ChevronRight className="size-3" aria-hidden="true" />
                  </li>
                  <li>
                    {active?.label ??
                      (path === "/dev/gallery"
                        ? "Component gallery"
                        : "Page not found")}
                  </li>
                  {path.startsWith("/leads/") && (
                    <li className="flex items-center gap-2">
                      <ChevronRight className="size-3" aria-hidden="true" />
                      Inquiry detail
                    </li>
                  )}
                </ol>
              </nav>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-sm border bg-muted px-2 py-1 text-xs font-semibold">
              <span
                className="size-1.5 rounded-full bg-muted-foreground"
                aria-hidden="true"
              />
              {label}
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="page-container">
          {children}
        </main>
        <footer className="px-5 pb-6 text-xs text-muted-foreground lg:px-8">
          Du Anyam · Internal use{" "}
          <span className="mx-2" aria-hidden="true">
            /
          </span>{" "}
          Performance Marketing OS
        </footer>
      </div>
    </div>
  );
}
