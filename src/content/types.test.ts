import { describe, expect, it } from "vitest";
import { allChapters, allPassages, findChapter } from "./types";
import type { Work } from "./types";

const WORK: Work = {
  id: "w",
  title: { la: "T", en: "t" },
  author: { la: "A", en: "a" },
  source: {
    latin: "",
    english: "",
    columnsPresent: "",
    missingColumns: "",
    leaves: [],
    notes: [],
  },
  lectio: { steps: [] },
  parts: [
    {
      id: "p1",
      title: { la: "P1", en: "p1" },
      chapters: [
        {
          id: "c1",
          caput: "I",
          title: { la: "C1", en: "c1" },
          plColumns: "941",
          passages: [
            {
              id: "p1a",
              n: "1",
              la: "la",
              en: "en",
              plColumn: "941",
              facsimile: null,
            },
          ],
        },
      ],
    },
    {
      id: "p2",
      title: { la: "P2", en: "p2" },
      chapters: [
        {
          id: "c2",
          caput: null,
          title: { la: "C2", en: "c2" },
          plColumns: "942",
          passages: [
            {
              id: "p2a",
              n: "2",
              la: "la",
              en: "en",
              plColumn: "942",
              facsimile: "pl-942.png",
            },
            {
              id: "p2b",
              n: "3",
              la: "la",
              en: "en",
              plColumn: "942",
              facsimile: null,
            },
          ],
        },
      ],
    },
  ],
};

describe("allChapters", () => {
  it("flattens chapters across parts in order", () => {
    expect(allChapters(WORK).map((c) => c.id)).toEqual(["c1", "c2"]);
  });
});

describe("allPassages", () => {
  it("flattens every passage", () => {
    expect(allPassages(WORK).map((p) => p.id)).toEqual(["p1a", "p2a", "p2b"]);
  });
});

describe("findChapter", () => {
  it("finds a chapter by id", () => {
    expect(findChapter(WORK, "c2")?.caput).toBeNull();
    expect(findChapter(WORK, "c1")?.id).toBe("c1");
  });

  it("returns undefined for an unknown id", () => {
    expect(findChapter(WORK, "nope")).toBeUndefined();
  });
});
