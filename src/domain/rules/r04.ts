import { result, quiet, missing, changed, type Rule } from "./types";
export const r04: Rule = (m, s) => {
  if (
    [m.cpl, m.priorCpl, m.cpql, m.priorCpql, m.mqlRate, m.priorMqlRate].some(
      (v) => v === null,
    ) ||
    m.priorMqlRate === 0
  )
    return missing("Perbandingan kualitas cohort matang tidak tersedia.");
  return m.cpl! < m.priorCpl! &&
    changed(m.mqlRate, m.priorMqlRate, s.qualityFall, "down") &&
    m.cpql! > m.priorCpql!
    ? result(
        "INVESTIGATE",
        true,
        "CPL turun, MQL rate turun melewati ambang, CPQL naik.",
        "Periksa kualitas lead dan kesesuaian pesan/audiens; dokumentasikan hipotesis eksperimen.",
      )
    : quiet();
};
