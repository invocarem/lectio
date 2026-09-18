import { describe, expect, it } from "vitest";
import { latinWordCount } from "./LatinText";

describe("latinWordCount", () => {
  it("counts words separated by spaces", () => {
    expect(latinWordCount("Rogasti me frater")).toBe(3);
  });

  it("ignores punctuation-only tokens", () => {
    expect(latinWordCount("Numquid ergo? — Certe.")).toBe(3);
  });

  it("keeps words joined by an apostrophe as one token", () => {
    expect(latinWordCount("dixitque mihi")).toBe(2);
  });

  it("counts accented Latin letters", () => {
    expect(latinWordCount("Cumque nēmō haec")).toBe(3);
  });

  it("handles empty and whitespace-only text", () => {
    expect(latinWordCount("")).toBe(0);
    expect(latinWordCount("   , . - ")).toBe(0);
  });
});
