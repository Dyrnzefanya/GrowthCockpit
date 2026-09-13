import { z } from "zod";
export const identityText = (value: string | null | undefined) =>
  (value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
export function email(value: string | null | undefined) {
  const text = identityText(value);
  return z.email().safeParse(text).success ? text : null;
}
export function phone(value: string | null | undefined) {
  let text = (value ?? "").trim().replace(/[\s().-]/g, "");
  if (text.startsWith("08")) text = "+62" + text.slice(1);
  else if (text.startsWith("62")) text = "+" + text;
  return /^\+[1-9]\d{7,14}$/.test(text) ? text : null;
}
export function domain(value: string | null | undefined) {
  const text = identityText(value);
  if (!text) return null;
  try {
    const url = new URL(text.includes("://") ? text : "https://" + text);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      !url.hostname.includes(".")
    )
      return null;
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
export function platform(
  source: string | null,
  explicit: string,
  clickType: string,
) {
  if (["fbclid", "ctwa_clid"].includes(clickType)) return "meta";
  if (clickType === "gclid") return "google";
  if (clickType === "li_fat_id") return "linkedin";
  if (explicit !== "unknown") return explicit;
  const known: Record<string, string> = {
    facebook: "meta",
    fb: "meta",
    instagram: "meta",
    ig: "meta",
    meta: "meta",
    google: "google",
    linkedin: "linkedin",
    tiktok: "tiktok",
    organic: "organic",
    direct: "direct",
    referral: "referral",
  };
  return known[identityText(source)] ?? "unknown";
}
export function allocations(
  rule: string,
  last: string | null,
  first: string | null,
) {
  if (rule === "contact_first_touch") return [{ campaign: first, weight: 1 }];
  if (rule === "split_50_50" && last !== first)
    return [
      { campaign: first, weight: 0.5 },
      { campaign: last, weight: 0.5 },
    ];
  return [{ campaign: last, weight: 1 }];
}
