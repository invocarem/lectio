import {
  assembleWork,
  facsimileFor,
  parseTreatiseMarkdown,
  stripSectionMarks,
  type WorkMeta,
} from "./fromMarkdown";
import { concatSegments, type Segment, type Work } from "./types";

/**
 * Reader text tree stored beside a work's `work.ts`. Chrome (lede, facsimile
 * leaves, lectio prompts) stays in TypeScript; this JSON is the text.
 */
export type WorkTextSegment = Segment;

export type WorkTextPassage = {
  id: string;
  n?: string;
  plColumn: string;
  lacuna?: boolean;
  lacunaNote?: string;
  segments: WorkTextSegment[];
};

export type WorkTextChapter = {
  id: string;
  caput: string | null;
  title: { la: string; en: string };
  plColumns: string;
  passages: WorkTextPassage[];
};

export type WorkTextPart = {
  id: string;
  title: { la: string; en: string };
  chapters: WorkTextChapter[];
};

export type WorkText = {
  title: { la: string; en: string };
  author: { la: string; en: string };
  parts: WorkTextPart[];
};

const DUMMY_META: WorkMeta = {
  id: "gradibus",
  lede: "",
  citePrefix: "PL",
  source: {
    latin: "",
    english: "",
    columnsPresent: "",
    missingColumns: "",
    leaves: [],
    notes: [],
  },
  lectio: { steps: [] },
};

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function segmentBody(segments: Segment[], lang: "la" | "en"): string {
  return normalizeText(concatSegments(segments, lang));
}

export function assembleWorkText(latinMarkdown: string, englishMarkdown: string): WorkText {
  const work = assembleWork(latinMarkdown, englishMarkdown, DUMMY_META);
  return {
    title: work.title,
    author: work.author,
    parts: work.parts.map((part) => ({
      id: part.id,
      title: part.title,
      chapters: part.chapters.map((chapter) => ({
        id: chapter.id,
        caput: chapter.caput,
        title: chapter.title,
        plColumns: chapter.plColumns,
        passages: chapter.passages.map((passage) => ({
          id: passage.id,
          ...(passage.n ? { n: passage.n } : {}),
          plColumn: passage.plColumn,
          ...(passage.lacuna ? { lacuna: true, lacunaNote: passage.lacunaNote } : {}),
          segments: passage.segments,
        })),
      })),
    })),
  };
}

export function hydrateWorkText(text: WorkText, meta: WorkMeta): Work {
  return {
    ...meta,
    title: text.title,
    author: text.author,
    parts: text.parts.map((part) => ({
      id: part.id,
      title: part.title,
      chapters: part.chapters.map((chapter) => ({
        id: chapter.id,
        caput: chapter.caput,
        title: chapter.title,
        plColumns: chapter.plColumns,
        passages: chapter.passages.map((passage) => ({
          id: passage.id,
          n: passage.n,
          plColumn: passage.plColumn,
          facsimile: facsimileFor(passage.plColumn, meta.source.leaves),
          la: concatSegments(passage.segments, "la"),
          en: concatSegments(passage.segments, "en"),
          segments: passage.segments,
          ...(passage.lacuna
            ? { lacuna: true, lacunaNote: passage.lacunaNote }
            : {}),
        })),
      })),
    })),
  };
}

export type VerifyIssue = {
  passageId: string;
  lang: "la" | "en";
  message: string;
};

function markdownBodies(markdown: string): { n: string; plColumn: string; text: string }[] {
  return parseTreatiseMarkdown(markdown).parts.flatMap((part) =>
    part.chapters.flatMap((chapter) =>
      chapter.passages.map((passage) => ({
        n: passage.n,
        plColumn: passage.plColumn,
        text: stripSectionMarks(passage.text),
      })),
    ),
  );
}

function flattenPassages(text: WorkText): WorkTextPassage[] {
  return text.parts.flatMap((part) => part.chapters.flatMap((chapter) => chapter.passages));
}

/** Concatenated JSON segments must match the markdown body (whitespace-insensitive). */
export function verifyWorkText(
  text: WorkText,
  latinMarkdown: string,
  englishMarkdown: string,
): VerifyIssue[] {
  const issues: VerifyIssue[] = [];
  const latin = markdownBodies(latinMarkdown);
  const english = markdownBodies(englishMarkdown);
  const passages = flattenPassages(text);
  if (passages.length !== latin.length) {
    issues.push({
      passageId: "*",
      lang: "la",
      message: `JSON has ${passages.length} passages; Latin markdown has ${latin.length}.`,
    });
  }
  if (passages.length !== english.length) {
    issues.push({
      passageId: "*",
      lang: "en",
      message: `JSON has ${passages.length} passages; English markdown has ${english.length}.`,
    });
  }
  const n = Math.min(passages.length, latin.length, english.length);
  for (let i = 0; i < n; i++) {
    const passage = passages[i];
    const laBody = segmentBody(passage.segments, "la");
    const enBody = segmentBody(passage.segments, "en");
    const laMd = normalizeText(latin[i].text);
    const enMd = normalizeText(english[i].text);
    if (laBody !== laMd) {
      issues.push({
        passageId: passage.id,
        lang: "la",
        message: "Latin segments do not match markdown.",
      });
    }
    if (enBody !== enMd) {
      issues.push({
        passageId: passage.id,
        lang: "en",
        message: "English segments do not match markdown.",
      });
    }
  }
  return issues;
}

export function passageIsHandSplit(passage: WorkTextPassage): boolean {
  return passage.segments.length > 1 && !looksLikeSectionBlocks(passage);
}

/**
 * Multi-segment passages that only follow `#### N` markers are still a lossless
 * scaffold, not a hand split of a long paragraph.
 */
function looksLikeSectionBlocks(passage: WorkTextPassage): boolean {
  if (passage.segments.length < 2) return false;
  return passage.segments.every((segment) => Boolean(segment.n));
}

export class ScaffoldClobberError extends Error {
  constructor(readonly passageIds: string[]) {
    super(
      `Refusing to overwrite hand-split passages (use --force): ${passageIds.join(", ")}`,
    );
    this.name = "ScaffoldClobberError";
  }
}

/**
 * Keep authored multi-segment splits when they still match the markdown.
 * Refuse to clobber them unless `force` is set.
 */
export function mergeWorkText(existing: WorkText, scaffold: WorkText, force: boolean): WorkText {
  const existingById = new Map(flattenPassages(existing).map((passage) => [passage.id, passage]));
  const clobber: string[] = [];

  const parts = scaffold.parts.map((part) => ({
    ...part,
    chapters: part.chapters.map((chapter) => ({
      ...chapter,
      passages: chapter.passages.map((fresh) => {
        const prev = existingById.get(fresh.id);
        if (!prev || !passageIsHandSplit(prev)) return fresh;
        const stillMatches =
          segmentBody(prev.segments, "la") === segmentBody(fresh.segments, "la") &&
          segmentBody(prev.segments, "en") === segmentBody(fresh.segments, "en");
        if (!stillMatches) {
          clobber.push(fresh.id);
          return force ? fresh : prev;
        }
        return force ? fresh : prev;
      }),
    })),
  }));

  if (clobber.length > 0 && !force) {
    throw new ScaffoldClobberError(clobber);
  }

  return { title: scaffold.title, author: scaffold.author, parts };
}
