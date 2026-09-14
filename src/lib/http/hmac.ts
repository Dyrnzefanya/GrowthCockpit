import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function sign(
  secret: string,
  timestamp: string,
  method: string,
  path: string,
  body: Uint8Array,
) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${method}.${path}.`)
    .update(body)
    .digest("hex");
}
export function equalSecret(actual: string, expected: string) {
  return timingSafeEqual(
    createHash("sha256").update(actual).digest(),
    createHash("sha256").update(expected).digest(),
  );
}
export function verifySignature(
  signature: string,
  timestamp: string,
  method: string,
  path: string,
  body: Uint8Array,
  secrets: string[],
  now = Date.now(),
) {
  if (
    !/^\d{10}$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300 ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return false;
  const supplied = Buffer.from(signature, "hex");
  // Evaluate every rotation key, including after a match.
  let matches = 0;
  for (const secret of secrets)
    matches |= Number(
      timingSafeEqual(
        supplied,
        Buffer.from(sign(secret, timestamp, method, path, body), "hex"),
      ),
    );
  return matches !== 0;
}
export const payloadLimit = 256 * 1024;
export async function boundedBody(request: Request) {
  if (
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
      request.headers.get("content-type") ?? "",
    )
  )
    throw new Error("CONTENT_TYPE");
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > payloadLimit))
    throw new Error("PAYLOAD_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > payloadLimit) {
        await reader.cancel();
        throw new Error("PAYLOAD_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}
