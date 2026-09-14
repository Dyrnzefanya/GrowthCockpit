import { reachable } from "@/repositories/integrations";
export const dynamic = "force-dynamic";
export async function GET() {
  let db = false;
  try {
    db = await reachable();
  } catch {}
  return Response.json(
    {
      status: db ? "ok" : "degraded",
      version: "0.1.0",
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
      db: db ? "ok" : "fail",
    },
    { status: db ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
