export type WorkId = "gradibus" | "rule";

export type LangText = {
  la: string;
  en: string;
};

/** One reading chunk: Latin and English are an authored 1:1 pair. */
export type Segment = {
  id: string;
  la: string;
  en: string;
  /** Bernard section number from a `#### N` marker, shown as §N. */
  n?: string;
};

export type Passage = {
  id: string;
  n?: string;
  la: string;
  en: string;
  /** Source citation without the work prefix, e.g. "941" or "7.1". */
  plColumn: string;
  facsimile: string | null;
  lacuna?: boolean;
  lacunaNote?: string;
  /** Authored reading chunks. `la` / `en` on the passage are their concatenation. */
  segments: Segment[];
};

export function concatSegments(segments: Segment[], lang: "la" | "en"): string {
  return segments.map((segment) => segment[lang]).join(" ").replace(/ +/g, " ").trim();
}

export function asSegments(passageId: string, la: string, en: string, n?: string): Segment[] {
  return [{ id: `${passageId}.1`, la, en, ...(n ? { n } : {}) }];
}

export type Chapter = {
  id: string;
  caput: string | null;
  /** Short list label, e.g. "Cap. I", "Praef.", "Prol.". Derived if omitted. */
  label?: string;
  title: LangText;
  plColumns: string;
  passages: Passage[];
};

export type Part = {
  id: string;
  title: LangText;
  chapters: Chapter[];
};

export type SourceLeaf = {
  columns: string;
  pdf: string;
  page: number;
  facsimile: string;
};

export type LectioStep = {
  id: string;
  la: string;
  en: string;
  prompt: string;
};

export type Work = {
  id: WorkId;
  title: LangText;
  author: LangText;
  /** Short English lede for the work home page. */
  lede: string;
  /** Provenance of the Latin edition. */
  edition?: string;
  /** Citation prefix shown in the UI, e.g. "PL" or "RB". */
  citePrefix: string;
  source: {
    latin: string;
    english: string;
    columnsPresent: string;
    missingColumns: string;
    leaves: SourceLeaf[];
    notes: string[];
    missingFacsimileNote?: string;
  };
  lectio: {
    steps: LectioStep[];
  };
  parts: Part[];
};

export function allChapters(work: Work): Chapter[] {
  return work.parts.flatMap((part) => part.chapters);
}

export function allPassages(work: Work): Passage[] {
  return allChapters(work).flatMap((chapter) => chapter.passages);
}

export function findChapter(work: Work, chapterId: string): Chapter | undefined {
  return allChapters(work).find((chapter) => chapter.id === chapterId);
}

export function chapterLabel(chapter: Chapter): string {
  if (chapter.label) return chapter.label;
  return chapter.caput ? `Cap. ${chapter.caput}` : "Praef.";
}

export function cite(work: Work, ref: string): string {
  const body = ref.trim();
  if (!body) return "";
  return work.citePrefix ? `${work.citePrefix} ${body}` : body;
}
