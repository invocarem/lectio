/**
 * Subdivide long Latin prose into comfortably sized reading blocks for
 * step-through navigation, without ever cutting a sentence in half.
 *
 * Strategy:
 *  1. `splitSentences` breaks text at sentence-ending `.`, `?`, `!`, but
 *     knows the Vulgate/Latin abbreviation set (Matth., cap., Reg., …) and
 *     single-letter abbreviations (S. Bernardus) so it does not split inside
 *     a scripture citation or title.
 *  2. `groupSentences` merges consecutive short sentences toward a word
 *     target (~25 by default) so a block is "a breath of Latin", not one
 *     sentence. A single sentence longer than the target stays whole (we
 *     never cut mid-sentence — clause-splitting is deliberately out of scope).
 *  3. An editorial override (`groups: number[]`) lets a curator hand-pick how
 *     many sentences go in each block for a specific passage/block, when the
 *     automatic result is wrong.
 */

export type SubdivideOptions = {
  /** Target words per block; only used as a merge ceiling for short sentences. */
  targetWords?: number;
  /** Optional hand-authored sentence-count groups, e.g. [2, 1, 3]. */
  groups?: number[];
};

/**
 * Editorial override for one §N block:
 *  - `number[]`        → how many Latin sentences go in each chunk (English is
 *                        then aligned proportionally, as before),
 *  - `{ la, en }`      → explicit, parallel chunk lists: la[i] is read with
 *                        en[i]. This is the exact 1:1 form for hand-authored
 *                        Latin ↔ English pairing.
 */
export type SubdivisionOverride = number[] | { la: string[]; en: string[] };

/** Resolve a block into parallel reading chunks, honouring the override. */
export function resolveSubdivision(
  laText: string,
  enText: string | undefined,
  override?: SubdivisionOverride,
  targetWords = 25,
): { subs: string[]; enRows: string[] } {
  // Explicit Latin + English chunk lists (exact pairing).
  if (override && !Array.isArray(override) && Array.isArray(override.la) && override.la.length > 0) {
    const en = Array.isArray(override.en) ? override.en : [];
    const subs = override.la.slice();
    const enRows = subs.map((_, i) => en[i] ?? "");
    return { subs, enRows };
  }
  // Latin sentence-count groups (English aligned by proportion).
  if (Array.isArray(override)) {
    const subs = subdivide(laText, { targetWords, groups: override });
    return { subs, enRows: enText ? subdivideAligned(enText, subs.length) : [] };
  }
  // No override → automatic Latin + proportional English.
  const subs = subdivide(laText, { targetWords });
  return { subs, enRows: enText ? subdivideAligned(enText, subs.length) : [] };
}

const WORD_RE = /([A-Za-z\u00C0-\u024F''\u2019]+)/;

export function wordCount(text: string): number {
  return text.split(WORD_RE).filter((_, i) => i % 2 === 1).length;
}

const CLOSING_AFTER_PERIOD = new Set([")", "]", "}", '"', "”", "’", "'"]);

/**
 * Latin / Vulgate abbreviations whose period must not end a sentence.
 * Book abbreviations cover the citations actually used in this library
 * (Psal., Ioan., Matth., cap., Reg., …) plus common scholarly ones.
 * Keys are stored without the trailing period, compared case-insensitively.
 */
const ABBREVIATIONS = new Set([
  // general / citation
  "s", "ss", "c", "cap", "caps", "v", "vv", "vs", "vol", "p", "pp", "n", "nn",
  "q", "sq", "seq", "al", "e.g", "i.e", "et", "cf", "no", "nos", "ap", "no",
  // scripture books (Vulgate spellings used here and common ones)
  "gen", "exod", "lev", "num", "deut", "ios", "jud", "ruth", "reg",
  "par", "esdr", "tob", "est", "job", "iob", "ps", "psal", "prov", "eccl", "cant",
  "sap", "eccli", "ecclus", "isa", "ier", "lam", "bar", "ezech", "dan",
  "osee", "ioel", "amos", "abd", "ion", "mich", "nah", "hab", "soph", "agg",
  "zach", "mal", "mach", "matth", "marc", "luc", "ioan", "act", "rom",
  "cor", "gal", "eph", "philipp", "col", "thess", "tim", "tit", "philem",
  "hebr", "iac", "petr", "ioann", "jud", "apoc", "apo", "apocal",
]);

/**
 * After a known abbreviation, a capital + lowercase (Unde, Ego) starts a new
 * sentence. All-caps roman numerals (XIV) and lowercase citations (xiv, 7)
 * do not. This is how "est." the verb splits while "Est. xiv" stays a citation.
 */
function followedBySentenceStart(text: string, dotIndex: number): boolean {
  let j = dotIndex + 1;
  while (j < text.length && /\s/.test(text[j])) j += 1;
  if (j >= text.length) return false;
  if (!/\p{Lu}/u.test(text[j])) return false;
  const next = text[j + 1];
  if (next && /\p{Lu}/u.test(next)) return false;
  return true;
}

/** Is the period at `dotIndex` part of an abbreviation (i.e. not a sentence end)? */
function periodIsAbbreviation(text: string, dotIndex: number): boolean {
  let i = dotIndex - 1;
  while (i >= 0 && /[A-Za-z\u00C0-\u024F]/.test(text[i])) i -= 1;
  const token = text.slice(i + 1, dotIndex);
  if (!token) return false;
  // A lone letter + period is an abbreviation (S., c., v., p., …), never a
  // one-letter sentence — even when the next word is capitalized (S. Bernardus).
  if (token.length === 1) return true;
  if (!ABBREVIATIONS.has(token.toLowerCase())) return false;
  return !followedBySentenceStart(text, dotIndex);
}

/**
 * Split text into sentences at `.`, `?`, `!`. A period is a boundary only
 * when it is not part of a known abbreviation and not a lone-letter
 * abbreviation. Known abbreviations still end a sentence when the next word
 * is capitalized (`est. Unde` splits; `Ioan. xiv` does not). A boundary
 * consumes any immediately following closing punctuation (e.g. the `)` in
 * "8.)").
 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];
    if (ch === "?" || ch === "!") {
      out.push(text.slice(start, i + 1));
      start = i + 1;
      i += 1;
      continue;
    }
    if (ch === ".") {
      const isBoundary = !periodIsAbbreviation(text, i);
      if (isBoundary) {
        let end = i + 1;
        while (end < len && CLOSING_AFTER_PERIOD.has(text[end])) end += 1;
        out.push(text.slice(start, end));
        start = end;
        i = end;
        continue;
      }
      i += 1;
      continue;
    }
    i += 1;
  }

  if (start < len) out.push(text.slice(start));

  return mergeTrailingCitations(out);
}

/** Split into groups of sentences of the given sizes (sum must equal count). */
function groupByCounts(sentences: string[], groups: number[]): string[] {
  const blocks: string[] = [];
  let cursor = 0;
  for (const size of groups) {
    if (size <= 0) continue;
    const slice = sentences.slice(cursor, cursor + size);
    if (slice.length === 0) break;
    blocks.push(slice.join(" "));
    cursor += size;
  }
  if (cursor < sentences.length) {
    blocks.push(sentences.slice(cursor).join(" "));
  }
  return blocks;
}

/**
 * Glue a short trailing parenthetical citation (e.g. "(Psal. xxiv, 8.)") onto
 * the sentence before it, so a bare reference never becomes its own reading
 * chunk. Kept conservative: only merges a short bracketed fragment with no
 * question/exclamation of its own.
 */
function mergeTrailingCitations(segments: string[]): string[] {
  const out: string[] = [];
  for (const segment of segments) {
    const trimmed = segment.trim();
    const prev = out[out.length - 1];
    if (
      prev &&
      (trimmed.startsWith("(") || trimmed.startsWith("[")) &&
      !/[?!]/.test(trimmed) &&
      wordCount(trimmed) <= 8
    ) {
      out[out.length - 1] = `${prev} ${trimmed}`;
    } else {
      out.push(trimmed);
    }
  }
  return out;
}

/** Merge short sentences into blocks up to `targetWords`; never split a sentence. */
export function groupSentences(sentences: string[], targetWords = 25): string[] {
  const normalized = sentences.filter(Boolean);
  const blocks: string[] = [];
  let current: string[] = [];
  let words = 0;

  for (const sentence of normalized) {
    const w = wordCount(sentence);
    if (current.length > 0 && words + w > targetWords) {
      blocks.push(current.join(" "));
      current = [];
      words = 0;
    }
    current.push(sentence);
    words += w;
  }
  if (current.length > 0) blocks.push(current.join(" "));
  return blocks;
}

/**
 * Subdivide a block of prose into reading chunks. Uses the editorial `groups`
 * override when supplied and valid; otherwise merges sentences toward the
 * word target.
 */
export function subdivide(
  text: string,
  opts: SubdivideOptions = {},
): string[] {
  const { targetWords = 25, groups } = opts;
  const sentences = splitSentences(text);

  if (groups && groups.length > 0) {
    const total = groups.reduce((a, b) => a + (b > 0 ? b : 0), 0);
    // Fall back to automatic merging if the override doesn't account for
    // every sentence (e.g. the text changed).
    if (total === sentences.length) {
      return groupByCounts(sentences, groups);
    }
  }

  return groupSentences(sentences, targetWords);
}

/**
 * Subdivide a parallel rendering (e.g. the English column) into exactly
 * `rowCount` chunks aligned by proportion to the already-subdivided primary
 * text, so the same step index highlights both columns.
 *
 * English is deliberately *not* a 1:1 sentence match with the Latin, so this
 * distributes English sentences across the rows by cumulative word share.
 * Rows with no sentence assigned come back empty so the index alignment with
 * the Latin rows is always exact.
 */
export function subdivideAligned(
  text: string,
  rowCount: number,
): string[] {
  const sentences = splitSentences(text);
  const desired = Math.max(0, Math.floor(rowCount));
  if (desired === 0) return [];
  if (desired === 1) {
    const joined = sentences.filter(Boolean).join(" ").trim();
    return [joined];
  }

  const totalWords = sentences.reduce((a, s) => a + wordCount(s), 0);
  const out: string[] = [];
  let row = 0;
  let current: string[] = [];
  let words = 0;

  for (const sentence of sentences) {
    const w = wordCount(sentence);
    // Close the current row when the next sentence would meet or overshoot
    // this row's proportional word share, and advance to the next row.
    while (row < desired - 1 && current.length > 0 && words + w >= (totalWords * (row + 1)) / desired) {
      out.push(current.join(" "));
      current = [];
      words = 0;
      row += 1;
    }
    current.push(sentence);
    words += w;
  }
  if (current.length > 0) out.push(current.join(" "));

  // Pad so the row count always matches the Latin rows (index alignment).
  while (out.length < desired) out.push("");
  return out.slice(0, desired);
}
