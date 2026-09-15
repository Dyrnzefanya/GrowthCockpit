import { result, quiet, missing, type Rule } from "./types";
export const r06: Rule = (m) => {
  if (m.leadGen === null)
    return missing("Status kampanye lead-generation belum dikonfigurasi.");
  if (!m.leadGen) return quiet("Bukan kampanye lead-generation.");
  if (m.recentSpend === null || m.noLeadHours === null)
    return missing("Spend atau waktu observasi CRM tidak tersedia.");
  return m.recentSpend > 0 && m.noLeadHours > 24
    ? result(
        "INVESTIGATE",
        true,
        "Spend > 0 dan tidak ada lead CRM selama > 24 jam.",
        "Periksa jalur tracking dan ingest CRM segera; ini dugaan kegagalan pelacakan, bukan verdict kinerja.",
      )
    : quiet();
};
