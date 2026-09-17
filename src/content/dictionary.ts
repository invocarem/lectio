import lexiconJson from "./lexicon/lexicon.json";

export type Edited = {
  lemma?: string;
  pos?: string;
  gloss: string;
  note?: string;
};

export type Sense = {
  lemma?: string;
  pos?: string;
  gloss: string;
};

export type Entry = {
  key: string;
  form: string;
  query: string;
  count?: number;
  first?: number | string | null;
  pos?: string[];
  senses?: Sense[];
  no_gloss?: boolean;
  curated?: boolean;
  edited?: Edited;
};

type LexiconPayload = {
  entries: Entry[];
};

const payload = lexiconJson as unknown as LexiconPayload;

const byKey = new Map<string, Entry>();
const byQuery = new Map<string, Entry>();

for (const entry of payload.entries) {
  byKey.set(entry.key, entry);
  if (entry.query && !byQuery.has(entry.query)) {
    byQuery.set(entry.query, entry);
  }
}

/** Normalise a clicked token to a lexicon key (lowercase, punctuation stripped). */
export function normalise(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/^[\W_]+|[\W_]+$/g, "");
}

function queryForm(form: string): string {
  let query = form.replace(/j/g, "i").replace(/v/g, "u");
  if (query.startsWith("charit")) {
    query = `carit${query.slice(6)}`;
  }
  return query;
}

/** Candidates for a printed form, including j/i, v/u, and y/i spelling bridges. */
function candidates(raw: string): string[] {
  const key = normalise(raw);
  if (!key) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const variant of [key, key.replace(/j/g, "i"), key.replace(/y/g, "i"), queryForm(key)]) {
    if (!seen.has(variant)) {
      seen.add(variant);
      out.push(variant);
    }
  }
  return out;
}

export function lookup(raw: string): Entry | undefined {
  for (const key of candidates(raw)) {
    const hit = byKey.get(key) ?? byQuery.get(key);
    if (hit) return hit;
  }
  return undefined;
}

/** The preferred short gloss: the curated card first, else Whitaker's first sense. */
export function glossFor(entry: Entry): string {
  if (entry.edited?.gloss) {
    return entry.edited.gloss;
  }
  return entry.senses?.[0]?.gloss ?? (entry.no_gloss ? "(no gloss)" : "");
}

/** The preferred lemma: the curated card's lemma, else the first sense's lemma, else the key. */
export function lemmaFor(entry: Entry): string {
  if (entry.edited?.lemma) {
    return entry.edited.lemma;
  }
  return entry.senses?.[0]?.lemma ?? entry.key;
}

/** All Whitaker gloss senses as lines. */
export function sensesFor(entry: Entry): string[] {
  return entry.senses?.map((s) => s.gloss).filter(Boolean) ?? [];
}
