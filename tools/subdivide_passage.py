#!/usr/bin/env python3
"""Subdivide one long passage in a work's work.json into reading segments.

This is a safe, reviewable alternative to hand-editing work.json: it splits a
single passage into `--subs` consecutive segments (the app shows a passage as
several numbered reading steps only when `segments.length > 1`, e.g. caput-i-1
and caput-xxii-54-56). The Latin is split at sentence boundaries and grouped
into `--subs` roughly-equal chunks; the English column is aligned
proportionally to the same number of chunks. The original `la`/`en` text is
never changed or dropped:

  * conservation check — the tool refuses to write unless joining the new
    segments reproduces the passage's original text (whitespace-normalised);
  * backup — a copy of work.json is written to <work.json>.bak before writing
    unless --no-backup is given;
  * ids — new segment ids are regenerated as <passage-id>.<1..N>; the passage's
    § number (`n`) is kept on the first segment only, matching the existing
    subdivided passages.

Usage:
    python tools/subdivide_passage.py --work gradibus --passage caput-ii-3-943 --subs 3
    python tools/subdivide_passage.py --work gradibus --passage caput-ii-3-943 --subs 2 --dry-run
    python tools/subdivide_passage.py --work gradibus --passage caput-ii-3-943 --subs 3 --no-backup

The chunking logic is a Python port of src/content/subdivide.ts (splitSentences,
subdivideAligned, sentence grouping). `--groups` (e.g. --groups 2,1,3) lets a
curator hand-pick how many Latin sentences go in each chunk, overriding the
automatic balance.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "src" / "content"

# ── Latin sentence splitting (ported from src/content/subdivide.ts) ──────────

WORD_RE = re.compile(r"([A-Za-z\u00C0-\u024F''\u2019]+)")

CLOSING_AFTER_PERIOD = set(')]}\u201d\u201d\u2019"\'')  # ) ] } " ” ’ '

ABBREVIATIONS = {
    # general / citation
    "s", "ss", "c", "cap", "caps", "v", "vv", "vs", "vol", "p", "pp", "n", "nn",
    "q", "sq", "seq", "al", "e.g", "i.e", "et", "cf", "no", "nos", "ap", "no",
    # scripture books (Vulgate spellings used here and common ones)
    "gen", "exod", "lev", "num", "deut", "ios", "jud", "ruth", "reg",
    "par", "esdr", "tob", "est", "job", "iob", "ps", "psal", "prov", "eccl", "cant",
    "sap", "eccli", "ecclus", "isa", "ier", "lam", "bar", "ezech", "dan",
    "osee", "ioel", "amos", "abd", "ion", "mich", "nah", "hab", "soph", "agg",
    "zach", "mal", "mach", "matth", "marc", "luc", "ioan", "act", "rom",
    "cor", "gal", "eph", "philipp", "col", "thess", "tim", "tit", "philem",
    "hebr", "iac", "petr", "ioann", "jud", "apoc", "apo", "apocal",
}


def word_count(text: str) -> int:
    return len(WORD_RE.split(text)[1::2])


def _followed_by_sentence_start(text: str, dot_index: int) -> bool:
    j = dot_index + 1
    while j < len(text) and text[j].isspace():
        j += 1
    if j >= len(text):
        return False
    if not text[j].isupper():
        return False
    nxt = text[j + 1] if j + 1 < len(text) else ""
    if nxt and nxt.isupper():
        return False
    return True


def _period_is_abbreviation(text: str, dot_index: int) -> bool:
    i = dot_index - 1
    while i >= 0 and re.match(r"[A-Za-z\u00C0-\u024F]", text[i]):
        i -= 1
    token = text[i + 1:dot_index]
    if not token:
        return False
    if len(token) == 1:  # S., c., v., p., … — lone letter + period
        return True
    if token.lower() not in ABBREVIATIONS:
        return False
    return not _followed_by_sentence_start(text, dot_index)


def _merge_trailing_citations(segments: list[str]) -> list[str]:
    """Glue a short trailing bracketed citation onto the sentence before it."""
    out: list[str] = []
    for segment in segments:
        trimmed = segment.strip()
        prev = out[-1] if out else None
        if (
            prev
            and (trimmed.startswith("(") or trimmed.startswith("["))
            and not re.search(r"[?!]", trimmed)
            and word_count(trimmed) <= 8
        ):
            out[-1] = f"{prev} {trimmed}"
        else:
            out.append(trimmed)
    return out


def split_sentences(text: str) -> list[str]:
    out: list[str] = []
    start = 0
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if ch in "?!":
            out.append(text[start:i + 1])
            start = i + 1
            i += 1
            continue
        if ch == ".":
            if not _period_is_abbreviation(text, i):
                end = i + 1
                while end < n and text[end] in CLOSING_AFTER_PERIOD:
                    end += 1
                out.append(text[start:end])
                start = end
                i = end
                continue
            i += 1
            continue
        i += 1
    if start < n:
        out.append(text[start:])
    return _merge_trailing_citations(out)


# ── chunking ─────────────────────────────────────────────────────────────────

def group_by_counts(sentences: list[str], groups: list[int]) -> list[str]:
    blocks: list[str] = []
    cursor = 0
    for size in groups:
        if size <= 0:
            continue
        slice_ = sentences[cursor:cursor + size]
        if not slice_:
            break
        blocks.append(" ".join(slice_))
        cursor += size
    if cursor < len(sentences):
        blocks.append(" ".join(sentences[cursor:]))
    return blocks


def group_sentences_balanced(sentences: list[str], count: int) -> list[str]:
    """Group sentences into exactly `count` chunks, balancing by word share."""
    if count <= 1:
        return [" ".join(x for x in sentences if x).strip()] if sentences else []
    total = sum(word_count(s) for s in sentences)
    out: list[str] = []
    row, current, words = 0, [], 0
    for sentence in sentences:
        w = word_count(sentence)
        while (
            row < count - 1
            and current
            and words + w >= (total * (row + 1)) / count
        ):
            out.append(" ".join(current))
            current, words = [], 0
            row += 1
        current.append(sentence)
        words += w
    if current:
        out.append(" ".join(current))
    while len(out) < count:
        out.append("")
    return out[:count]


def subdivide_aligned(text: str, row_count: int) -> list[str]:
    """Split English into `row_count` chunks aligned by cumulative word share."""
    sentences = split_sentences(text)
    desired = int(row_count)
    if desired <= 0:
        return []
    if desired == 1:
        return [" ".join(x for x in sentences if x).strip()]

    total_words = sum(word_count(s) for s in sentences)
    out: list[str] = []
    row, current, words = 0, [], 0
    for sentence in sentences:
        w = word_count(sentence)
        while (
            row < desired - 1
            and current
            and words + w >= (total_words * (row + 1)) / desired
        ):
            out.append(" ".join(current))
            current, words = [], 0
            row += 1
        current.append(sentence)
        words += w
    if current:
        out.append(" ".join(current))
    while len(out) < desired:
        out.append("")
    return out[:desired]


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


# ── work.json editing ────────────────────────────────────────────────────────

def find_passage(work: dict, passage_id: str):
    for part in work.get("parts", []):
        for chapter in part.get("chapters", []):
            for passage in chapter.get("passages", []):
                if passage.get("id") == passage_id:
                    return chapter, passage
    return None, None


def rebuild_segments(passage: dict, la_chunks: list[str], en_chunks: list[str]) -> list[dict]:
    """Build new segment objects preserving the passage § number on segment 1."""
    pid = passage["id"]
    original_n = None
    for segment in passage.get("segments", []):
        if segment.get("n"):
            original_n = segment["n"]
            break
    segments: list[dict] = []
    for i, (la, en) in enumerate(zip(la_chunks, en_chunks)):
        seg: dict = {"id": f"{pid}.{i + 1}"}
        if i == 0 and original_n:
            seg["n"] = original_n
        seg["la"] = la
        seg["en"] = en
        segments.append(seg)
    return segments


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--work", default="gradibus", help="work id (default: gradibus)")
    parser.add_argument("--passage", required=True, help="passage id, e.g. caput-ii-3-943")
    parser.add_argument("--subs", type=int, default=3, help="number of segments to split into (default: 3)")
    parser.add_argument("--groups", help="comma list of Latin sentences per chunk, e.g. 2,10,6 (overrides --subs balance)")
    parser.add_argument("--en-groups", help="comma list of English sentences per chunk, e.g. 2,4,5 (exact topical pairing; default: proportional alignment)")
    parser.add_argument("--dry-run", action="store_true", help="print the plan but do not write")
    parser.add_argument("--no-backup", action="store_true", help="do not write a .bak copy")
    args = parser.parse_args()

    if args.subs < 2:
        parser.error("--subs must be at least 2 (a single segment needs no subdivision)")

    workdir = CONTENT / args.work
    json_path = workdir / "work.json"
    if not json_path.exists():
        sys.exit(f"error: no {json_path}")

    work = json.loads(json_path.read_text(encoding="utf-8"))
    chapter, passage = find_passage(work, args.passage)
    if passage is None:
        sys.exit(f"error: passage '{args.passage}' not found in {args.work}")

    # Reconstruct the full passage text from its existing segments (so the tool
    # is safe to re-run on an already-subdivided passage).
    existing = passage.get("segments") or []
    la_full = " ".join(s.get("la", "") for s in existing).strip()
    en_full = " ".join(s.get("en", "") for s in existing).strip()
    if not la_full:
        sys.exit(f"error: passage '{args.passage}' has no Latin text")

    sentences = split_sentences(la_full)
    if len(sentences) == 1:
        # Only one sentence — cannot subdivide without splitting a sentence.
        sys.exit(f"error: '{args.passage}' is a single sentence; no safe split point")

    if args.groups:
        groups = [int(x) for x in args.groups.split(",") if x.strip()]
        if sum(g for g in groups if g > 0) != len(sentences):
            sys.exit(
                "error: --groups sentence counts must account for every "
                f"sentence ({len(sentences)} found)"
            )
        la_chunks = group_by_counts(sentences, groups)
    else:
        la_chunks = group_sentences_balanced(sentences, args.subs)

    if args.en_groups:
        en_sentences = split_sentences(en_full)
        en_counts = [int(x) for x in args.en_groups.split(",") if x.strip()]
        if sum(g for g in en_counts if g > 0) != len(en_sentences):
            sys.exit(
                "error: --en-groups sentence counts must account for every "
                f"English sentence ({len(en_sentences)} found)"
            )
        en_chunks = group_by_counts(en_sentences, en_counts)
        if len(en_chunks) != len(la_chunks):
            sys.exit("error: --en-groups produced a different number of chunks than the Latin")
    else:
        en_chunks = subdivide_aligned(en_full, len(la_chunks))

    # Conservation check: joining the new chunks must reproduce the source text.
    if normalize(" ".join(la_chunks)) != normalize(la_full):
        sys.exit("error: Latin conservation check failed — refusing to write")
    if normalize(" ".join(en_chunks)) != normalize(en_full):
        sys.exit("error: English conservation check failed — refusing to write")

    new_segments = rebuild_segments(passage, la_chunks, en_chunks)

    def words(s: str) -> int:
        return word_count(s)

    print(f"passage  : {passage['id']}  ({passage.get('n','')})  col {passage.get('plColumn','')}")
    print(f"chapter  : {chapter.get('id')} — {chapter.get('title',{}).get('en','')}")
    print(f"before   : 1 segment, {words(la_full)} la words")
    print(f"after    : {len(new_segments)} segments, {words(la_full)} la words (unchanged text)")
    for i, seg in enumerate(new_segments):
        print(f"  {seg['id']}  ({words(seg['la'])} la words)  {seg['la'][:60]!r}…")

    if args.dry_run:
        print("\n[dry-run] no files written")
        return

    if not args.no_backup:
        bak = json_path.with_suffix(json_path.suffix + ".bak")
        bak.write_text(json_path.read_text(encoding="utf-8"), encoding="utf-8")
        print(f"backup   : wrote {bak.name}")

    passage["segments"] = new_segments
    json_path.write_text(json.dumps(work, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote    : {json_path}")


if __name__ == "__main__":
    main()
