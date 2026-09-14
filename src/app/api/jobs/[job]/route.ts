import { dispatchJob } from "@/services/jobs/runner";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ job: string }> },
) {
  return dispatchJob(request, (await params).job);
}
// Native Vercel cron is GET; this path accepts bearer auth only for GET.
export const GET = POST;
