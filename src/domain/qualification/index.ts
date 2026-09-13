import type { LeadInput } from "@/config/lead-schema";
import {
  email,
  phone,
  domain,
  identityText,
} from "@/domain/attribution/normalise";
export const qualificationVersion = "q1";
export type QualificationSettings = {
  minQuantity: number;
  freeDomains: string[];
  internalDomains: string[];
  competitorDomains: string[];
};
export function qualify(input: LeadInput, settings: QualificationSettings) {
  const mail = email(input.email),
    tel = phone(input.phone),
    companyDomain = domain(input.company_domain);
  const mailDomain = mail?.split("@")[1] ?? "";
  const identity = [
    input.full_name,
    input.email.split("@")[0],
    input.company_name,
  ]
    .map(identityText)
    .join(" ");
  let disqualify: string | null = null;
  if (!mail && !tel) disqualify = "DQ_NO_CONTACT";
  else if (
    /\b(test|asdf)\b/i.test(identity) ||
    settings.internalDomains.includes(mailDomain)
  )
    disqualify = "DQ_TEST";
  else if (/\b(skripsi|tugas|penelitian|magang)\b/i.test(input.message))
    disqualify = "DQ_NONCOMMERCIAL";
  else if (companyDomain && settings.competitorDomains.includes(companyDomain))
    disqualify = "DQ_COMPETITOR";
  else if (input.out_of_scope) disqualify = "DQ_OUT_OF_SCOPE";
  if (disqualify)
    return {
      status: "disqualified" as const,
      reasons: [disqualify],
      version: qualificationVersion,
    };
  const business = Boolean(
    input.company_name ||
    (mailDomain && !settings.freeDomains.includes(mailDomain)),
  );
  const tests: [string, boolean][] = [
    ["Q_CONTACTABLE", Boolean(mail || tel)],
    ["Q_BUSINESS", business],
    ["Q_INTENT", Boolean(input.product_interest || input.message.length >= 20)],
    [
      "Q_SIZE",
      (input.estimated_quantity !== null &&
        input.estimated_quantity >= settings.minQuantity) ||
        Boolean(input.required_by_date) ||
        (input.estimated_quantity === null && business),
    ],
  ];
  return {
    status: tests.every(([, match]) => match)
      ? ("mql" as const)
      : ("new" as const),
    reasons: tests.filter(([, match]) => match).map(([code]) => code),
    version: qualificationVersion,
  };
}
