import { result, quiet, missing, changed, type Rule } from "./types";
export const r10: Rule = (m, s) => {
  if (
    s.frequency === null ||
    m.frequency === null ||
    m.ctr === null ||
    m.priorCtr === null ||
    m.priorCtr === 0
  )
    return missing(
      "Frequency, threshold atau perbandingan CTR tidak tersedia.",
    );
  return m.frequency > s.frequency &&
    changed(m.ctr, m.priorCtr, s.ctrFall, "down")
    ? result(
        "INVESTIGATE",
        true,
        "Frequency melewati threshold dan CTR turun sesuai ambang.",
        "Periksa kelelahan kreatif; catat eksperimen kreatif tanpa perubahan otomatis.",
        [
          "Frequency adalah nilai platform pada hari lengkap terakhir, bukan penjumlahan reach antarhari.",
        ],
      )
    : quiet();
};
