import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const secretPatterns = [
  ["Meta access token", /EAA[A-Za-z0-9]{70,}/g],
  ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{20,}/g],
  [
    "JWT credential",
    /eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{20,}/g,
  ],
  ["OpenAI key", /sk-[A-Za-z0-9_-]{20,}/g],
  ["Slack token", /xoxb-[A-Za-z0-9-]{20,}/g],
  ["personal access token", /(?:github_pat_|pat-)[A-Za-z0-9_-]{20,}/g],
  ["bearer token", /Bearer\s+[A-Za-z0-9._~+/=-]{20,}/g],
  [
    "Slack webhook",
    /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]{20,}/g,
  ],
];

export function findSecretTypes(content) {
  return secretPatterns
    .filter(([, pattern]) => {
      pattern.lastIndex = 0;
      return pattern.test(content);
    })
    .map(([name]) => name);
}

const serverSecretNames = [
  "SUPABASE_SECRET_KEY",
  "INGEST_HMAC_SECRET",
  "INGEST_HMAC_SECRET_PREVIOUS",
  "CRON_SECRET",
  "HUBSPOT_ACCESS_TOKEN",
  "HUBSPOT_CLIENT_SECRET",
  "SLACK_WEBHOOK_URL",
  "META_ACCESS_TOKEN",
];

export function findConfiguredSecretNames(content, environment = process.env) {
  return serverSecretNames.filter((name) => {
    const value = environment[name];
    return value && value.length >= 12 && content.includes(value);
  });
}

function trackedAndUntrackedFiles() {
  return execFileSync("git", [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ])
    .toString()
    .split("\0")
    .filter(Boolean);
}

function main() {
  const findings = [];

  for (const file of trackedAndUntrackedFiles()) {
    // Git also lists tracked paths deleted or moved in the working tree.
    if (!existsSync(file)) continue;
    const content = readFileSync(file);
    if (content.includes(0)) continue;

    const text = content.toString("utf8");
    for (const type of [
      ...findSecretTypes(text),
      ...findConfiguredSecretNames(text),
    ]) {
      findings.push(`${file}: ${type}`);
    }
  }

  const history = execFileSync(
    "git",
    ["log", "--all", "--full-history", "--no-ext-diff", "-p"],
    { encoding: "utf8", maxBuffer: 100 * 1024 * 1024 },
  );
  const historyTypes = [
    ...findSecretTypes(history),
    ...findConfiguredSecretNames(history),
  ];
  for (const type of new Set(historyTypes))
    findings.push(`git history: ${type}`);

  if (findings.length) {
    console.error(`Potential secrets found:\n${findings.join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log(
      "No potential secrets found in the working tree or Git history.",
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
