import { describe, expect, it } from "vitest";
import { findSecretTypes } from "./check-secrets.mjs";

describe("secret scanner", () => {
  it("detects supported secret shapes without flagging variable names", () => {
    const token = ["sk", "a".repeat(24)].join("-");

    expect(findSecretTypes(token)).toEqual(["OpenAI key"]);
    expect(
      findSecretTypes(
        "OPENAI_API_KEY= and Authorization: Bearer ${CRON_SECRET}",
      ),
    ).toEqual([]);
  });
});
