import { describe, expect, it } from "vitest";
import { findPiiTypes } from "./check-logs.mjs";

describe("log PII scanner", () => {
  it("detects email and Indonesian phone shapes without flagging safe metadata", () => {
    expect(findPiiTypes("contact@example.test")).toEqual(["email"]);
    expect(findPiiTypes("phone=+6281234567890")).toEqual(["phone"]);
    expect(
      findPiiTypes('{"correlation_id":"66666666-6666-4666-8666-666666666666"}'),
    ).toEqual([]);
  });
});
