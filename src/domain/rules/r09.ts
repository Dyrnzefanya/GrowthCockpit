import { result, quiet, missing, type Rule } from "./types";
export const revenueAllowed = (value: number | null, minimum: number) =>
  value !== null && value >= minimum;
export const r09: Rule = (m, s) =>
  m.outcomeCompleteness === null
    ? missing(
        "Outcome completeness tidak tersedia; verdict revenue/ROAS/CAC tidak tersedia.",
      )
    : !revenueAllowed(m.outcomeCompleteness, s.minOutcome)
      ? result(
          "SUPPRESSED",
          true,
          "Outcome completeness di bawah minimum; hanya verdict revenue/ROAS/CAC ditekan.",
          "Lengkapi Won/Lost untuk deal melewati expected close; quality verdict tetap independen.",
        )
      : quiet(
          "Gerbang kelengkapan outcome lolos; r1 tidak menerbitkan verdict revenue.",
        );
