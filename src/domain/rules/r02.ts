import { result, quiet, missing, type Rule } from "./types";
export const r02: Rule = (m, s) => {
  if (s.targetCpql === null || s.currency === null)
    return missing("Target CPQL bisnis belum dikonfigurasi.");
  if (m.currency !== s.currency)
    return missing("Currency target CPQL berbeda dari kampanye.");
  if (m.spend === null || m.mql === null)
    return missing("Spend atau MQL cohort matang tidak tersedia.");
  return m.spend >= 3 * s.targetCpql && m.mql === 0
    ? result(
        "PAUSE_CANDIDATE",
        true,
        "Spend ≥ 3× target CPQL dengan 0 MQL.",
        "Tinjau kandidat pause di Meta; dokumentasikan keputusan sebagai eksperimen.",
      )
    : quiet();
};
