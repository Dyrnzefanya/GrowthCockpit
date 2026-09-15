import { result, quiet, missing, changed, type Rule } from "./types";
export const r03: Rule = (m, s) => {
  if (
    [m.cpl, m.priorCpl, m.cpql, m.priorCpql].some((v) => v === null) ||
    m.priorCpl === 0 ||
    m.priorCpql === 0
  )
    return missing("Perbandingan CPL/CPQL cohort matang tidak tersedia.");
  return changed(m.cpl, m.priorCpl, s.cplRise, "up") &&
    changed(m.cpql, m.priorCpql, s.cpqlFall, "down")
    ? result(
        "HOLD",
        true,
        "CPL naik tetapi CPQL membaik sesuai ambang.",
        "Pertahankan; tinjau kualitas MQL. CPL hanya diagnostik, bukan target optimasi.",
      )
    : quiet();
};
