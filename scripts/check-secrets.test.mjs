import { describe, expect, it } from "vitest";
import { findSecretTypes } from "./check-secrets.mjs";

describe("secret scanner", () => {
  it("detects supported secret shapes without flagging variable names", () => {
    const token = ["sk", "a".repeat(24)].join("-");

    expect(findSecretTypes(token)).toEqual(["OpenAI key"]);
    expect(findSecretTypes(["sb_secret", "a".repeat(24)].join("_"))).toEqual([
      "Supabase secret key",
    ]);
    expect(
      findSecretTypes(
        ["eyJ" + "a".repeat(20), "eyJ" + "b".repeat(20), "c".repeat(24)].join(
          ".",
        ),
      ),
    ).toEqual(["JWT credential"]);
    expect(
      findSecretTypes(
        "OPENAI_API_KEY= and Authorization: Bearer ${CRON_SECRET}",
      ),
    ).toEqual([]);
  });
});
