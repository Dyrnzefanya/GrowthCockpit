import { result, quiet, missing, type Rule } from "./types";
export const r05: Rule = (m, s) => {
  if (s.targetCpql === null || s.currency === null)
    return missing("Target CPQL bisnis belum dikonfigurasi.");
  if (m.currency !== s.currency)
    return missing("Currency target CPQL berbeda dari kampanye.");
  if (
    m.cpql === null ||
    m.mql === null ||
    m.dailyCpql.length !== 7 ||
    m.dailyCpql.some((v) => v === null)
  )
    return missing(
      "CPQL, MQL atau tujuh hari bukti stabilitas cohort matang belum lengkap.",
    );
  return m.cpql <= s.targetCpql &&
    m.mql >= s.minResults &&
    m.dailyCpql.every((v) => v! <= s.targetCpql!)
    ? result(
        "SCALE_CANDIDATE",
        true,
        "CPQL ≤ target, volume MQL memenuhi minimum, stabil tujuh hari.",
        "Pertimbangkan langkah kenaikan budget secara manual di Meta dan catat eksperimen; jumlah budget tidak dihitung.",
        ["Kinerja historis tidak menjamin hasil berikutnya."],
      )
    : quiet();
};
