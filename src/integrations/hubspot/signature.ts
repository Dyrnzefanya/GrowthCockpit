import { createHash, createHmac } from "node:crypto";
import { equalSecret } from "@/lib/http/hmac";
export function verifyHubspot(
  headers: Headers,
  body: Uint8Array,
  canonicalUrl: string,
  secret: string,
  now = Date.now(),
) {
  const v3 = headers.get("x-hubspot-signature-v3");
  if (v3 !== null) {
    const timestamp = headers.get("x-hubspot-request-timestamp") ?? "";
    if (
      !/^\d{13}$/.test(timestamp) ||
      Math.abs(now - Number(timestamp)) > 300000
    )
      return false;
    const url = canonicalUrl.replace(
      /%(3A|2F|3F|40|21|24|27|28|29|2A|2C|3B)/gi,
      (match) => decodeURIComponent(match),
    );
    return equalSecret(
      v3,
      createHmac("sha256", secret)
        .update("POST" + url)
        .update(body)
        .update(timestamp)
        .digest("base64"),
    );
  }
  if (headers.get("x-hubspot-signature-version") !== "v1") return false;
  const signature = headers.get("x-hubspot-signature") ?? "";
  return (
    /^[a-f0-9]{64}$/.test(signature) &&
    equalSecret(
      signature,
      createHash("sha256").update(secret).update(body).digest("hex"),
    )
  );
}
