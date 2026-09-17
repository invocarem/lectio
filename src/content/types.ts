export type LangText = {
  la: string;
  en: string;
};

export type Passage = {
  id: string;
  n?: string;
  la: string;
  en: string;
  plColumn: string;
  facsimile: string | null;
  lacuna?: boolean;
  lacunaNote?: string;
};

export type Chapter = {
  id: string;
  caput: string | null;
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

export type Work = {
  id: string;
  title: LangText;
  author: LangText;
  source: {
    latin: string;
    english: string;
    columnsPresent: string;
    missingColumns: string;
    leaves: SourceLeaf[];
    notes: string[];
  };
  lectio: {
    steps: { id: string; la: string; en: string; prompt: string }[];
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
