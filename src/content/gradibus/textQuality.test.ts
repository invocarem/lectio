import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  facsimileFor,
  parseTreatiseMarkdown,
  splitPassageBlocks,
  stripSectionMarks,
} from "../fromMarkdown";
import { getWork } from "../works";

/**
 * Text-quality checks for *De gradibus*. These are not parser tests.
 *
 * Latin is judged against the Migne leaves in `public/facsimiles/`
 * (`pl-941-942.png` … `pl-971-972.png`). English is judged as a facing
 * rendering of that Latin, not of a later critical recension. Columns
 * 945–946 have no leaf in this collection.
 *
 * Units are the Praefatio lectio passages (no Bernard numbers) and
 * Bernard’s 57 numbered Migne paragraphs (`#### 1` … `#### 57`).
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const facsimileDir = join(repoRoot, "public/facsimiles");
const latinMd = readFileSync(join(here, "latin.md"), "utf8");
const englishMd = readFileSync(join(here, "english.md"), "utf8");
const leaves = getWork("gradibus").source.leaves;

export type LectioUnit = {
  n: string;
  pl: string;
  chapter: string;
  la: string;
  en: string;
  facsimile: string | null;
};

function lectioUnits(): LectioUnit[] {
  const latin = parseTreatiseMarkdown(latinMd);
  const english = parseTreatiseMarkdown(englishMd);
  const out: LectioUnit[] = [];
  latin.parts.forEach((part, partIndex) => {
    part.chapters.forEach((chapter, chapterIndex) => {
      const enChapter = english.parts[partIndex].chapters[chapterIndex];
      chapter.passages.forEach((passage, passageIndex) => {
        const enPassage = enChapter.passages[passageIndex];
        const laBlocks = splitPassageBlocks(passage.text);
        const enBlocks = splitPassageBlocks(enPassage.text);
        const count = Math.max(laBlocks.length, enBlocks.length);
        for (let i = 0; i < count; i++) {
          const n = laBlocks[i]?.n ?? enBlocks[i]?.n ?? passage.n;
          if (!n) continue;
          out.push({
            n,
            pl: passage.plColumn,
            chapter: chapter.heading,
            la: stripSectionMarks(laBlocks[i]?.text ?? ""),
            en: stripSectionMarks(enBlocks[i]?.text ?? ""),
            facsimile: facsimileFor(passage.plColumn, leaves),
          });
        }
      });
    });
  });
  return out;
}

const UNITS = lectioUnits();
const PREFACE = UNITS.filter((unit) => /^praefatio$/i.test(unit.chapter));
const SECTIONS = UNITS.filter((unit) => /^\d+$/.test(unit.n));
const QUALITY = [...PREFACE, ...SECTIONS];
const BY_N = Object.fromEntries(QUALITY.map((unit) => [unit.n, unit]));

/** Words or phrases that cannot be what the Migne leaf prints. */
const UNREADABLE_LATIN = [
  "prospectiebat",
  "campotestate",
  "Cogneoscetur",
  "stamim",
  "legiter",
  "intercallum",
  "Ploeus",
  "infalegendum",
  "tenuter",
  "illicia",
  "pede tenim",
  "tractatus testat",
  "oendendo",
  "almusitudo",
  "pro liciis",
  "nullius, manes",
  "non rene",
  "inius festinat",
  "non senit",
  "coram mittit",
  "consuescentia",
];

/**
 * Phrases read from the leaf in `public/facsimiles`. Spelling follows this
 * project’s rule: Migne’s *j* is written *i*.
 */
const LEAF_WITNESSES: Record<string, string[]> = {
  "Praef.": ["Rogasti me, frater Godefride"],
  "praef-2": ["Cum autem charitas hunc foras misisset timorem"],
  "praef-3": ["Cumque neutram viam tutam"],
  "1": ["Locuturus ergo de gradibus humilitatis"],
  "2": ["Humilitatis vero talis potest esse definitio"],
  "3": ["prospiciebat super filios hominum"],
  "50": ["tenuiter adhuc submurmurans", "vadum tentat", "pedetentim"],
  "51": ["libitis pro licitis", "foras mittit"],
  "57": ["Dicis forsitan, frater Godefride"],
};

const NO_LEAF_COLUMNS = new Set(["945", "946", "945–946"]);

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function unitLabel(n: string): string {
  return /^\d+$/.test(n) ? `§${n}` : n;
}

describe("De gradibus text quality", () => {
  it("has the Praefatio as three lectio passages on PL 941", () => {
    expect(PREFACE.map((unit) => unit.n)).toEqual(["Praef.", "praef-2", "praef-3"]);
    expect(PREFACE.every((unit) => unit.pl === "941")).toBe(true);
    expect(PREFACE.every((unit) => unit.facsimile === "pl-941-942.png")).toBe(true);
  });

  it("has Bernard’s 57 sections once each, in order", () => {
    expect(SECTIONS.map((section) => section.n)).toEqual(
      Array.from({ length: 57 }, (_, i) => String(i + 1)),
    );
  });

  it("keeps every declared facsimile file in public/facsimiles", () => {
    for (const leaf of leaves) {
      expect(existsSync(join(facsimileDir, leaf.facsimile)), leaf.facsimile).toBe(true);
    }
  });

  it.each(QUALITY)("$n has Latin and English ($pl)", (unit) => {
    expect(unit.la.length, "Latin empty").toBeGreaterThan(40);
    expect(unit.en.length, "English empty").toBeGreaterThan(40);
  });

  it.each(QUALITY)("$n maps to the Migne leaf for $pl", (unit) => {
    const cols = [...unit.pl.matchAll(/\d+/g)].map((match) => match[0]);
    const onlyMissingLeaves = cols.every((col) => col === "945" || col === "946");
    if (onlyMissingLeaves || NO_LEAF_COLUMNS.has(unit.pl)) {
      expect(unit.facsimile).toBeNull();
      return;
    }
    expect(unit.facsimile, `no leaf for PL ${unit.pl}`).toBeTruthy();
    expect(existsSync(join(facsimileDir, unit.facsimile!)), unit.facsimile).toBe(true);
  });

  it.each(QUALITY)("$n Latin has no unreadable tokens vs the leaf", (unit) => {
    const hits = UNREADABLE_LATIN.filter((token) =>
      unit.la.toLowerCase().includes(token.toLowerCase()),
    );
    expect(hits, `${unitLabel(unit.n)} still has: ${hits.join(", ")}`).toEqual([]);
  });

  it.each(QUALITY)("$n English is long enough to face the Latin", (unit) => {
    const ratio = wordCount(unit.en) / Math.max(wordCount(unit.la), 1);
    expect(
      ratio,
      `${unitLabel(unit.n)} EN/LA word ratio ${ratio.toFixed(2)} (Latin ${wordCount(unit.la)}, English ${wordCount(unit.en)})`,
    ).toBeGreaterThanOrEqual(0.85);
  });

  it.each(Object.entries(LEAF_WITNESSES))(
    "%s Latin contains phrases read from its leaf",
    (n, phrases) => {
      const unit = BY_N[n];
      expect(unit, `missing ${unitLabel(n)}`).toBeDefined();
      for (const phrase of phrases) {
        expect(unit.la, `${unitLabel(n)} missing leaf phrase: ${phrase}`).toContain(phrase);
      }
    },
  );
});
