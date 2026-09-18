import type { Chapter, Part, Passage, SourceLeaf, Work } from "./types";

export type ParsedPassage = {
  n: string;
  plColumn: string;
  text: string;
  lacunaNote?: string;
};

export type ParsedChapter = {
  heading: string;
  plColumns: string;
  passages: ParsedPassage[];
};

export type ParsedPart = {
  heading: string;
  chapters: ParsedChapter[];
};

export type ParsedDoc = {
  title: string;
  author: string;
  source: string;
  parts: ParsedPart[];
};

export type WorkMeta = Pick<Work, "id" | "source" | "lectio" | "lede" | "citePrefix" | "edition">;

const PASSAGE_HEADING = /^### (.+) \(PL (.+)\)$/;
const BERNARD_SECTION = /^####\s+(\S+)\s*$/;
const CHAPTER_PL = /^PL (.+)$/;
const CAPUT_HEADING = /^Caput ([IVXLCDM]+)\.\s*(.*)$/;
const CHAPTER_HEADING = /^Chapter ([IVXLCDM]+)\.\s*(.*)$/;

export type PassageBlock = {
  n?: string;
  text: string;
};

/** Split stored passage text on `§52` markers produced from `#### 52`. */
export function splitPassageBlocks(text: string): PassageBlock[] {
  const lines = text.split("\n");
  const blocks: PassageBlock[] = [];
  let current: PassageBlock = { text: "" };
  const flush = () => {
    const body = current.text.trim();
    if (body || current.n) blocks.push({ n: current.n, text: body });
    current = { text: "" };
  };
  for (const line of lines) {
    const mark = /^§(\S+)\s*$/.exec(line.trim());
    if (mark) {
      flush();
      current = { n: mark[1], text: "" };
      continue;
    }
    current.text = current.text ? `${current.text}\n${line}` : line;
  }
  flush();
  return blocks.length ? blocks : [{ text: text.trim() }];
}

export function parseTreatiseMarkdown(markdown: string): ParsedDoc {
  const lines = markdown.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  const skipEmpty = () => {
    while (i < lines.length && lines[i].trim() === "") i += 1;
  };

  skipEmpty();
  if (!lines[i]?.startsWith("# ")) {
    throw new Error("Treatise markdown must start with a title heading.");
  }
  const title = lines[i].slice(2).trim();
  i += 1;
  skipEmpty();
  const author = (lines[i] ?? "").trim();
  i += 1;
  skipEmpty();
  const source = (lines[i] ?? "").trim();
  i += 1;

  const parts: ParsedPart[] = [];
  let part: ParsedPart | undefined;
  let chapter: ParsedChapter | undefined;
  let passage: { n: string; plColumn: string; lines: string[]; lacunaNote?: string } | undefined;

  const flushPassage = () => {
    if (!passage || !chapter) return;
    chapter.passages.push({
      n: passage.n,
      plColumn: passage.plColumn,
      text: passage.lines.join("\n").trim(),
      lacunaNote: passage.lacunaNote,
    });
    passage = undefined;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("# ")) {
      flushPassage();
      part = { heading: line.slice(2).trim(), chapters: [] };
      parts.push(part);
      chapter = undefined;
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      flushPassage();
      if (!part) {
        throw new Error(`Chapter heading before a part: ${line}`);
      }
      chapter = { heading: line.slice(3).trim(), plColumns: "", passages: [] };
      part.chapters.push(chapter);
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      flushPassage();
      if (!chapter) {
        throw new Error(`Passage heading before a chapter: ${line}`);
      }
      const match = PASSAGE_HEADING.exec(line);
      if (!match) {
        throw new Error(`Unrecognised passage heading: ${line}`);
      }
      passage = { n: match[1], plColumn: match[2], lines: [] };
      i += 1;
      continue;
    }
    if (CHAPTER_PL.test(line) && chapter && chapter.passages.length === 0 && !passage) {
      chapter.plColumns = line.replace(/^PL\s+/, "").trim();
      i += 1;
      continue;
    }
    if (line.startsWith("> ") && passage) {
      passage.lacunaNote = line.slice(2).trim();
      i += 1;
      continue;
    }
    const bernard = BERNARD_SECTION.exec(line);
    if (bernard && passage) {
      passage.lines.push(`§${bernard[1]}`);
      i += 1;
      continue;
    }
    if (passage) {
      passage.lines.push(line);
    }
    i += 1;
  }
  flushPassage();

  if (parts.length === 0) {
    throw new Error("Treatise markdown has no parts.");
  }
  return { title, author, source, parts };
}

function partId(latinHeading: string, index: number): string {
  if (/humilitat/i.test(latinHeading) && /prima/i.test(latinHeading)) return "humility";
  if (/superbiae/i.test(latinHeading)) return "pride";
  return `part-${index + 1}`;
}

function chapterFromHeadings(latinHeading: string, englishHeading: string): Pick<Chapter, "id" | "caput" | "title"> {
  const caput = CAPUT_HEADING.exec(latinHeading);
  if (caput) {
    const english = CHAPTER_HEADING.exec(englishHeading);
    return {
      id: `caput-${caput[1].toLowerCase()}`,
      caput: caput[1],
      title: { la: caput[2], en: english?.[2] ?? englishHeading },
    };
  }
  if (/^praefatio$/i.test(latinHeading)) {
    return { id: "praefatio", caput: null, title: { la: "Praefatio", en: "Preface" } };
  }
  throw new Error(`Unrecognised chapter heading: ${latinHeading}`);
}

function passageId(chapterId: string, passage: ParsedPassage, index: number): string {
  const n = passage.n.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  const col = passage.plColumn.replace(/[^\d]+/g, "-");
  return n ? `${chapterId}-${n}-${col}` : `${chapterId}-${index}`;
}

function columnNumbers(label: string): number[] {
  return [...label.matchAll(/\d+/g)].map((match) => Number(match[0]));
}

/**
 * Resolve a PL label into an inclusive column range. Handles Migne shorthand
 * like "941\u201342" (941\u2013942), "947\u201372" (947\u2013972) as well as plain
 * single columns such as "941".
 */
function columnRange(label: string): { start: number; end: number } {
  const dash = /(\d+)\s*[–—-]\s*(\d+)/.exec(label);
  if (dash) {
    const first = dash[1];
    const second = dash[2];
    const end =
      second.length < first.length
        ? Number(first.slice(0, first.length - second.length) + second)
        : Number(second);
    return { start: Number(first), end };
  }
  const single = /\d+/.exec(label);
  const start = single ? Number(single[0]) : NaN;
  return { start, end: start };
}

export function facsimileFor(plColumn: string, leaves: SourceLeaf[]): string | null {
  for (const n of columnNumbers(plColumn)) {
    const leaf = leaves.find((item) => {
      const { start, end } = columnRange(item.columns);
      return n >= start && n <= end;
    });
    if (leaf) return leaf.facsimile;
  }
  return null;
}

function zipPassages(
  chapterId: string,
  latin: ParsedPassage[],
  english: ParsedPassage[],
  leaves: SourceLeaf[],
): Passage[] {
  if (latin.length !== english.length) {
    throw new Error(`${chapterId} has ${latin.length} Latin passages and ${english.length} English passages.`);
  }
  return latin.map((la, index) => {
    const en = english[index];
    if (la.plColumn !== en.plColumn) {
      throw new Error(`${chapterId} passage ${index} PL mismatch: ${la.plColumn} vs ${en.plColumn}.`);
    }
    return {
      id: passageId(chapterId, la, index),
      n: la.n,
      plColumn: la.plColumn,
      facsimile: facsimileFor(la.plColumn, leaves),
      la: la.text,
      en: en.text,
      ...(la.lacunaNote || en.lacunaNote
        ? { lacuna: true, lacunaNote: en.lacunaNote ?? la.lacunaNote }
        : {}),
    };
  });
}

export function assembleWork(latinMarkdown: string, englishMarkdown: string, meta: WorkMeta): Work {
  const latin = parseTreatiseMarkdown(latinMarkdown);
  const english = parseTreatiseMarkdown(englishMarkdown);
  if (latin.parts.length !== english.parts.length) {
    throw new Error("Latin and English parts do not match.");
  }

  const parts: Part[] = latin.parts.map((latinPart, partIndex) => {
    const englishPart = english.parts[partIndex];
    if (latinPart.chapters.length !== englishPart.chapters.length) {
      throw new Error(`Part ${partIndex} chapter counts do not match.`);
    }
    return {
      id: partId(latinPart.heading, partIndex),
      title: { la: latinPart.heading, en: englishPart.heading },
      chapters: latinPart.chapters.map((latinChapter, chapterIndex) => {
        const englishChapter = englishPart.chapters[chapterIndex];
        const heading = chapterFromHeadings(latinChapter.heading, englishChapter.heading);
        return {
          ...heading,
          plColumns: latinChapter.plColumns,
          passages: zipPassages(heading.id, latinChapter.passages, englishChapter.passages, meta.source.leaves),
        };
      }),
    };
  });

  return {
    ...meta,
    title: { la: latin.title, en: english.title },
    author: { la: latin.author, en: english.author },
    parts,
  };
}
