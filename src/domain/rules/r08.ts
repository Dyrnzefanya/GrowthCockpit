import { result, quiet, missing, type Rule } from "./types";
export const r08: Rule = (m) =>
  !m.reviewDate
    ? missing("Tanggal review tidak tersedia.")
    : m.running && m.reviewDate <= m.today
      ? result(
          "MONITOR",
          true,
          "Eksperimen running mencapai tanggal review.",
          "Review bukti eksperimen; catat hasil, learning dan next action.",
        )
      : quiet();
