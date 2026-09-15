import { result, quiet, type Rule } from "./types";
export const r01: Rule = (m, s) =>
  m.sample === null || m.sample < s.minResults || m.completeDays < 3
    ? result(
        "MONITOR",
        true,
        `Sampel ${m.sample ?? "tidak tersedia"}; minimum ${s.minResults}; ${m.completeDays}/3 hari lengkap.`,
        "Tunggu sampel matang; investigasi masalah pelacakan tetap diperbolehkan.",
      )
    : quiet("Sampel memenuhi minimum.");
