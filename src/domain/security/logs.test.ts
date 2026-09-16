import { expect, it } from "vitest";
import { scrubLogValue } from "./logs";

it("TEST-13.3 redacts PII and URLs from client error stacks", () => {
  expect(
    scrubLogValue(
      "contact@example.test +6281234567890 https://example.test/path?token=hidden",
    ),
  ).toBe("[email] [phone] [url]");
});
