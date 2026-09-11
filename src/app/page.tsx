import { serverEnv } from "@/lib/env.server";

function buildCommit() {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    "local"
  ).slice(0, 7);
}

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold">
        Du Anyam Performance Marketing OS
      </h1>
      <p className="mt-2">Project foundation is ready.</p>
      <dl className="mt-6 text-sm">
        <div>
          <dt className="inline font-medium">Environment: </dt>
          <dd className="inline">{serverEnv.APP_ENV}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Build: </dt>
          <dd className="inline">{buildCommit()}</dd>
        </div>
      </dl>
    </main>
  );
}
