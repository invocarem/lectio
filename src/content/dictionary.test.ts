import { describe, expect, it } from "vitest";
import {
  glossFor,
  lemmaFor,
  lookup,
  normalise,
  sensesFor,
  type Entry,
} from "./dictionary";

describe("normalise", () => {
  it("lowercases and trims", () => {
    expect(normalise("  Charitas  ")).toBe("charitas");
  });

  it("strips leading and trailing punctuation", () => {
    expect(normalise("'sapientiam,")).toBe("sapientiam");
  });

  it("returns an empty string for a non-word", () => {
    expect(normalise("...")).toBe("");
    expect(normalise("   ")).toBe("");
  });
});

describe("lookup", () => {
  it("finds a Bertrand/Whitaker key case-insensitively", () => {
    expect(lookup("Charitas")?.key).toBe("charitas");
  });

  it("bridges variant spellings through the query (caritas -> charitas)", () => {
    expect(lookup("caritas")?.key).toBe("charitas");
  });

  it("returns undefined for a word not in the lexicon", () => {
    expect(lookup("zzzqqxnotaword")).toBeUndefined();
  });

  it("returns undefined for empty input", () => {
    expect(lookup("")).toBeUndefined();
    expect(lookup("   ")).toBeUndefined();
  });
});

describe("glossFor", () => {
  it("prefers the curated gloss", () => {
    const entry: Entry = {
      key: "x",
      form: "x",
      query: "x",
      curated: true,
      edited: { gloss: "curated gloss" },
      senses: [{ gloss: "first sense" }],
    };
    expect(glossFor(entry)).toBe("curated gloss");
  });

  it("falls back to the first Whitaker sense", () => {
    const entry: Entry = {
      key: "x",
      form: "x",
      query: "x",
      senses: [{ gloss: "first sense" }, { gloss: "second sense" }],
    };
    expect(glossFor(entry)).toBe("first sense");
  });

  it("handles no_gloss entries", () => {
    const entry: Entry = { key: "x", form: "x", query: "x", no_gloss: true };
    expect(glossFor(entry)).toBe("(no gloss)");
  });

  it("returns an empty string when nothing is available", () => {
    const entry: Entry = { key: "x", form: "x", query: "x" };
    expect(glossFor(entry)).toBe("");
  });
});

describe("lemmaFor", () => {
  it("prefers the curated lemma", () => {
    const entry: Entry = {
      key: "x",
      form: "x",
      query: "x",
      edited: { lemma: "curated lemma", gloss: "g" },
      senses: [{ lemma: "sense lemma", gloss: "g" }],
    };
    expect(lemmaFor(entry)).toBe("curated lemma");
  });

  it("falls back to the first sense lemma", () => {
    const entry: Entry = {
      key: "x",
      form: "x",
      query: "x",
      senses: [{ lemma: "sense lemma", gloss: "g" }],
    };
    expect(lemmaFor(entry)).toBe("sense lemma");
  });

  it("falls back to the key", () => {
    const entry: Entry = { key: "the-key", form: "x", query: "x" };
    expect(lemmaFor(entry)).toBe("the-key");
  });
});

describe("sensesFor", () => {
  it("returns all glosses and skips empty ones", () => {
    const entry: Entry = {
      key: "x",
      form: "x",
      query: "x",
      senses: [{ gloss: "a" }, { gloss: "" }, { gloss: "b" }],
    };
    expect(sensesFor(entry)).toEqual(["a", "b"]);
  });

  it("returns an empty array when there are no senses", () => {
    const entry: Entry = { key: "x", form: "x", query: "x" };
    expect(sensesFor(entry)).toEqual([]);
  });
});
