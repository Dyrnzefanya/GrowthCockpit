import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const patterns = [
  ["email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  ["phone", /(?<!\d)(?:\+?62|0)8\d{8,11}(?!\d)/],
];

export function findPiiTypes(content) {
  return patterns
    .filter(([, pattern]) => pattern.test(content))
    .map(([name]) => name);
}

function main() {
  const files = process.argv.slice(2);
  if (!files.length) throw new Error("Provide at least one log file.");
  const findings = files.flatMap((file) =>
    findPiiTypes(readFileSync(file, "utf8")).map((type) => `${file}: ${type}`),
  );
  if (findings.length) {
    console.error(
      `Potential PII found in logs (values suppressed):\n${findings.join("\n")}`,
    );
    process.exitCode = 1;
  } else {
    console.log("No email or phone patterns found in logs.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
