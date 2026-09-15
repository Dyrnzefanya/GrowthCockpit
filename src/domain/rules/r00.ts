import { result, quiet, type Rule } from "./types";
export const r00: Rule = (m, s, clock) => {
  const causes = [...m.missing];
  for (const source of m.sources) {
    if (!source.at || !Number.isFinite(Date.parse(source.at)))
      causes.push(`${source.name}: freshness tidak tersedia`);
    else if (clock - Date.parse(source.at) > source.slaHours * 7200000)
      causes.push(`${source.name}: stale > 2× SLA (${source.slaHours} jam)`);
  }
  if (!m.sources.length) causes.push("Sumber belum tersedia");
  if (m.mixedCurrency) causes.push("Mixed currency");
  if (m.coverage === null) causes.push("Attribution coverage tidak tersedia");
  else if (m.coverage < s.minCoverage)
    causes.push(`Attribution coverage ${m.coverage} < ${s.minCoverage}`);
  return causes.length
    ? result(
        "SUPPRESSED",
        true,
        causes.join("; "),
        "Perbaiki pengukuran: periksa integrasi dan atribusi sebelum mengambil keputusan kampanye.",
      )
    : quiet("Gerbang kualitas data lolos.");
};
