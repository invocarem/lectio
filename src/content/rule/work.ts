import latinMd from "./latin.md?raw";
import verheyen from "./renderings/verheyen.json";
import { assembleRuleChapters, type RuleRendering } from "../fromRule";
import { lectioSteps } from "../lectioSteps";
import type { Chapter, Work } from "../types";

/**
 * Thematic division of the Rule, in the spirit of De gradibus's editorial
 * parts (meaningful boundaries + titles rather than bare ranges). Chapter
 * headings themselves come from Verheyen's `titles` map.
 */
const THEMATIC = [
  ["prologus", "Prologus", "Prologue", undefined, undefined],
  ["foundations", "Capitula 1–7 — Fundamenta vitae monasticae", "Chapters 1–7 — The foundations of monastic life", 1, 7],
  ["office", "Capitula 8–20 — Opus Dei", "Chapters 8–20 — The Divine Office", 8, 20],
  ["discipline", "Capitula 21–30 — Disciplina congregationis", "Chapters 21–30 — Community discipline and correction", 21, 30],
  ["care", "Capitula 31–37 — Cellerarius et infirmi", "Chapters 31–37 — The cellarer and care of the weak", 31, 37],
  ["daily", "Capitula 38–57 — Lectio, labor, cibus", "Chapters 38–57 — Reading, labour, and food", 38, 57],
  ["reception", "Capitula 58–66 — Receptio et ordo", "Chapters 58–66 — Reception and rank in the community", 58, 66],
  ["fraternal", "Capitula 67–73 — Correctio fraterna", "Chapters 67–73 — Fraternal correction and the epilogue", 67, 73],
] as const;

const chapters = assembleRuleChapters(latinMd, verheyen as RuleRendering);

function numbered(lo: number, hi: number): Chapter[] {
  return chapters.filter(
    (chapter) => chapter.caput !== null && Number(chapter.caput) >= lo && Number(chapter.caput) <= hi,
  );
}

export const rule: Work = {
  id: "rule",
  title: { la: "Regula Sancti Benedicti", en: "The Rule of St Benedict" },
  author: { la: "S. Benedictus Nursinus Abbas", en: "St Benedict of Nursia" },
  lede:
    "A quiet reader for the Rule of St Benedict. The Latin is the traditional monastic text; Boniface Verheyen’s 1949 English sits beside it for meditation. Click a Latin word for a gloss.",
  citePrefix: "RB",
  edition:
    "The Latin Library, benedict.html — traditional monastic text of the Regula Benedicti (prologue + 73 chapters); ae/oe written without ligatures. A critical text (RB 1980 / de Vogüé) is still to be compared.",
  source: {
    latin:
      "Working Latin in src/content/rule/latin.md (traditional monastic text). The app never edits this file.",
    english:
      "Boniface Verheyen, The Holy Rule of St. Benedict (1949). Public domain (CCEL / Project Gutenberg). English paragraphs are joined onto the coarser numbered blocks in latin.md; they are not a 1:1 sentence alignment.",
    columnsPresent: "Prologus + 73 chapters",
    missingColumns: "",
    leaves: [],
    notes: [
      "Latin is the traditional monastic text from The Latin Library (benedict.html).",
      "English is Verheyen 1949. A hand-written close column is still to come.",
      "Chapter 7 (De humilitate) is the ancestor of Bernard’s ladder in De gradibus.",
    ],
  },
  lectio: { steps: lectioSteps },
  parts: THEMATIC.map(([id, la, en, lo, hi]) => ({
    id,
    title: { la, en },
    chapters:
      lo === undefined
        ? chapters.filter((chapter) => chapter.id === "rule:prologus")
        : numbered(lo, hi!),
  })),
};
