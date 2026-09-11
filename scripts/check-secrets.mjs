import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const secretPatterns = [
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

    for (const type of findSecretTypes(content.toString("utf8"))) {
      findings.push(`${file}: ${type}`);
    }
  }

  if (findings.length) {
    console.error(`Potential secrets found:\n${findings.join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log("No potential secrets found.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
