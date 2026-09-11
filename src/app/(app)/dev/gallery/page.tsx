import { notFound } from "next/navigation";
import { serverEnv } from "@/lib/env.server";
import { Gallery } from "./gallery";
export const dynamic = "force-dynamic";
export default function GalleryPage() {
  if (serverEnv.APP_ENV !== "development") notFound();
  return <Gallery />;
}
