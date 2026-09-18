import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assembleWork,
  facsimileFor,
  parseTreatiseMarkdown,
  splitPassageBlocks,
  stripSectionMarks,
  type WorkMeta,
} from "./fromMarkdown";
import type { SourceLeaf } from "./types";

const LATIN = [
  "# De Gradibus Humilitatis Et Superbiae Tractatus",
  "",
  "S. Bernardus Claraevallensis Abbas",
  "",
  "Ex editione Migne, PL 182.",
  "",
  "# Pars prima: de via humilitatis ad veritatem",
  "",
  "## Praefatio",
  "",
  "PL 941",
  "",
  "### Praef. (PL 941)",
  "",
  "Rogasti me, frater Godefride.",
  "",
  "#### 1",
  "",
  "Primum gradum humilitatis.",
  "",
  "### praef-2 (PL 941)",
  "",
  "Cum autem charitas.",
  "",
  "## Caput I. Christum esse viam humilitatis",
  "",
  "PL 941\u201342",
  "",
  "### 1 (PL 941\u201342)",
  "",
  "Locuturus ergo de gradibus.",
  "",
].join("\n");

const ENGLISH = [
  "# De Gradibus Humilitatis Et Superbiae Tractatus",
  "",
  "Bernard of Clairvaux",
  "",
  "From Migne, PL 182.",
  "",
  "# Part One: on the way of humility to truth",
  "",
  "## Preface",
  "",
  "PL 941",
  "",
  "### Praef. (PL 941)",
  "",
  "You asked me, brother Godefrid.",
  "",
  "#### 1",
  "",
  "The first step of humility.",
  "",
  "### praef-2 (PL 941)",
  "",
  "When charity.",
  "",
  "## Chapter I. Christ is the way of humility",
  "",
  "PL 941\u201342",
  "",
  "### 1 (PL 941\u201342)",
  "",
  "About to speak then of the steps.",
  "",
].join("\n");

const LEAVES: SourceLeaf[] = [
  { columns: "941\u201342", pdf: "MLT_1-4", page: 1, facsimile: "pl-941-942.png" },
  { columns: "947\u201372", pdf: "MLT_5_8", page: 1, facsimile: "pl-947-972.png" },
];

const META: WorkMeta = {
  id: "gradibus",
  lede: "test",
  citePrefix: "PL",
  source: {
    latin: "x",
    english: "y",
    columnsPresent: "941\u201372",
    missingColumns: "",
    leaves: LEAVES,
    notes: [],
  },
  lectio: {
    steps: [{ id: "lectio", la: "Lectio", en: "Reading", prompt: "Read." }],
  },
};

describe("parseTreatiseMarkdown", () => {
  it("parses title, author and source from the header", () => {
    const doc = parseTreatiseMarkdown(LATIN);
    expect(doc.title).toContain("De Gradibus Humilitatis");
    expect(doc.author).toContain("Bernardus");
    expect(doc.source).toContain("Migne");
  });

  it("parses parts, chapters and passages", () => {
    const doc = parseTreatiseMarkdown(LATIN);
    expect(doc.parts).toHaveLength(1);
    expect(doc.parts[0].chapters).toHaveLength(2);
    expect(doc.parts[0].chapters[0].passages).toHaveLength(2);
    expect(doc.parts[0].chapters[1].passages).toHaveLength(1);
    expect(doc.parts[0].chapters[1].plColumns).toBe("941\u201342");
  });

  it("throws when there are no parts", () => {
    expect(() => parseTreatiseMarkdown("# Title\n\nAuthor\n\nSource\n")).toThrow(/no parts/);
  });

  it("throws on a chapter heading before any part", () => {
    expect(() => parseTreatiseMarkdown("# T\n\nA\n\nS\n\n## C\n")).toThrow(/before a part/);
  });
});

describe("stripSectionMarks", () => {
  it("drops standalone Bernard section lines", () => {
    expect(stripSectionMarks("§1\n\nLocuturus ergo.")).toBe("Locuturus ergo.");
  });
});

describe("splitPassageBlocks", () => {
  it("splits on Bernard \u00a7 markers and keeps the body", () => {
    const blocks = splitPassageBlocks("Locuturus ergo.\n\u00a72\nAlterum autem.");
    expect(blocks).toEqual([
      { text: "Locuturus ergo." },
      { n: "2", text: "Alterum autem." },
    ]);
  });

  it("returns a single block when there are no markers", () => {
    expect(splitPassageBlocks("  Just one block.  ")).toEqual([{ text: "Just one block." }]);
  });

  it("returns the whole trimmed text as one block for empty input", () => {
    const blocks = splitPassageBlocks("Some text");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe("Some text");
  });
});

describe("facsimileFor", () => {
  it("maps a column range onto its leaf", () => {
    expect(facsimileFor("941\u201342", LEAVES)).toBe("pl-941-942.png");
  });

  it("maps a single column within a leaf's range", () => {
    expect(facsimileFor("942", LEAVES)).toBe("pl-941-942.png");
    expect(facsimileFor("960", LEAVES)).toBe("pl-947-972.png");
  });

  it("returns null for columns with no leaf", () => {
    expect(facsimileFor("945", LEAVES)).toBeNull();
  });
});

describe("De Gradibus source", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const latinMd = readFileSync(join(here, "gradibus/latin.md"), "utf8");
  const englishMd = readFileSync(join(here, "gradibus/english.md"), "utf8");

  const bernardNumbers = (markdown: string) =>
    parseTreatiseMarkdown(markdown).parts.flatMap((part) =>
      part.chapters.flatMap((chapter) =>
        chapter.passages.flatMap((passage) =>
          splitPassageBlocks(passage.text).flatMap((block) => (block.n ? [block.n] : [])),
        ),
      ),
    );

  it("marks Bernard’s 57 Migne sections in both languages, in order", () => {
    const expected = Array.from({ length: 57 }, (_, i) => String(i + 1));
    expect(bernardNumbers(latinMd)).toEqual(expected);
    expect(bernardNumbers(englishMd)).toEqual(expected);
  });

  it("zips the real Latin and English treatises", () => {
    expect(() => assembleWork(latinMd, englishMd, META)).not.toThrow();
  });
});

describe("assembleWork", () => {
  it("zips Latin and English into a Work with derived ids", () => {
    const work = assembleWork(LATIN, ENGLISH, META);
    expect(work.title.la).toContain("De Gradibus");
    expect(work.parts[0].id).toBe("humility");
    expect(work.parts[0].chapters.map((c) => c.id)).toEqual(["praefatio", "caput-i"]);
    expect(work.parts[0].chapters[1].passages[0].id).toBe("caput-i-1-941-42");
    expect(work.parts[0].chapters[1].passages[0].facsimile).toBe("pl-941-942.png");
    expect(work.parts[0].chapters[0].passages[0].la).toContain("Rogasti");
    expect(work.parts[0].chapters[0].passages[0].en).toContain("You asked");
  });

  it("throws when Latin and English passage counts differ", () => {
    const bad = ENGLISH.replace("About to speak", "### 2 (PL 941\u201342)\n\nExtra.\n\nAbout to speak");
    expect(() => assembleWork(LATIN, bad, META)).toThrow(/passages/);
  });

  it("throws when a passage PL column mismatches", () => {
    const bad = ENGLISH.replace("### 1 (PL 941\u201342)", "### 1 (PL 941)");
    expect(() => assembleWork(LATIN, bad, META)).toThrow(/PL mismatch/);
  });
});
