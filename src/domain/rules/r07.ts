import { result, quiet, missing, type Rule } from "./types";
export const r07: Rule = (m) =>
  m.staleWorkdays === null || m.followUpSla === null
    ? missing("Waktu aktivitas CRM/SLA tidak tersedia.")
    : m.staleWorkdays > m.followUpSla
      ? result(
          "INVESTIGATE",
          true,
          "MQL/SQL melewati SLA tanpa update CRM.",
          "Tindak lanjuti lead dan dokumentasikan aktivitas di CRM.",
        )
      : quiet();
