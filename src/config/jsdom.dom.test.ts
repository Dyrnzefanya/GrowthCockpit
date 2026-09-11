import { expect, it } from "vitest";

it("provides a jsdom test environment", () => {
  expect(document.createElement("main").tagName).toBe("MAIN");
});
