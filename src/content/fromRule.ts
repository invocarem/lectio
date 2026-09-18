import { asSegments, concatSegments, type Chapter, type Passage } from "./types";

export type ParsedRuleParagraph = {
  n: string;
  text: string;
};

export type ParsedRuleChapter = {
  heading: string;
  number: number | undefined;
  paragraphs: ParsedRuleParagraph[];
};

export type ParsedRuleDoc = {
  title: string;
  source: string;
  chapters: ParsedRuleChapter[];
};

export type RuleRendering = {
  source: string;
  titles: Record<string, string>;
  chapters: Record<string, Record<string, string>>;
};

const CAPITULUM = /^Capitulum\s+(\d+)\s*$/i;
const NUMBERED = /^(\d+)\.\s+(.*)$/;

function chapterKey(chapter: ParsedRuleChapter): string {
  return chapter.number === undefined ? "prologus" : String(chapter.number);
}

function chapterId(chapter: ParsedRuleChapter): string {
  return chapter.number === undefined ? "rule:prologus" : `rule:${chapter.number}`;
}

/**
 * Parse the Rule's working Latin (`## Prologus` / `## Capitulum N`, then
 * numbered paragraphs). This is the humility ingest shape, not the Bernard
 * treatise markdown.
 */
export function parseRuleMarkdown(markdown: string): ParsedRuleDoc {
  const lines = markdown.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  const skipEmpty = () => {
    while (i < lines.length && lines[i].trim() === "") i += 1;
  };

  skipEmpty();
  if (!lines[i]?.startsWith("# ")) {
    throw new Error("Rule markdown must start with a title heading.");
  }
  const title = lines[i].slice(2).trim();
  i += 1;
  skipEmpty();

  let source = "";
  if (lines[i]?.startsWith("*") && lines[i].endsWith("*")) {
    source = lines[i].slice(1, -1).trim();
    i += 1;
  }

  const chapters: ParsedRuleChapter[] = [];
  let chapter: ParsedRuleChapter | undefined;
  let paragraph: { n: string; lines: string[] } | undefined;

  const flushParagraph = () => {
    if (!paragraph || !chapter) return;
    chapter.paragraphs.push({
      n: paragraph.n,
      text: paragraph.lines.join("\n").trim(),
    });
    paragraph = undefined;
  };

  const startChapter = (heading: string) => {
    flushParagraph();
    const cap = CAPITULUM.exec(heading);
    chapter = {
      heading,
      number: cap ? Number(cap[1]) : undefined,
      paragraphs: [],
    };
    chapters.push(chapter);
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      startChapter(line.slice(3).trim());
      i += 1;
      continue;
    }
    if (line.trim() === "---") {
      i += 1;
      continue;
    }
    const numbered = NUMBERED.exec(line);
    if (numbered && chapter) {
      flushParagraph();
      paragraph = { n: numbered[1], lines: numbered[2] ? [numbered[2]] : [] };
      i += 1;
      continue;
    }
    if (paragraph) {
      paragraph.lines.push(line);
    }
    i += 1;
  }
  flushParagraph();

  if (chapters.length === 0) {
    throw new Error("Rule markdown has no chapters.");
  }
  return { title, source, chapters };
}

export function assembleRuleChapters(latinMarkdown: string, rendering: RuleRendering): Chapter[] {
  const latin = parseRuleMarkdown(latinMarkdown);
  return latin.chapters.map((parsed) => {
    const key = chapterKey(parsed);
    const englishTitle = rendering.titles[key] ?? (parsed.number === undefined ? "Prologue" : parsed.heading);
    const englishParas = rendering.chapters[key] ?? {};
    const passages: Passage[] = parsed.paragraphs.map((para) => {
      const cite = parsed.number === undefined ? `Prol. ${para.n}` : `${parsed.number}.${para.n}`;
      const id = `${chapterId(parsed)}:${para.n}`;
      const en = englishParas[para.n] ?? "";
      const segments = asSegments(id, para.text, en);
      return {
        id,
        n: para.n,
        la: concatSegments(segments, "la"),
        en: concatSegments(segments, "en"),
        plColumn: cite,
        facsimile: null,
        segments,
      };
    });
    return {
      id: chapterId(parsed),
      caput: parsed.number === undefined ? null : String(parsed.number),
      label: parsed.number === undefined ? "Prol." : `Cap. ${parsed.number}`,
      title: { la: parsed.heading, en: englishTitle },
      plColumns: parsed.number === undefined ? "Prol." : String(parsed.number),
      passages,
    };
  });
}
