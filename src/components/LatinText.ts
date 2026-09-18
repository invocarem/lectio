import { el } from "../dom";

/** Word-token boundary (Latin letters, incl. accented, plus apostrophes). */
const WORD_RE = /([A-Za-z\u00C0-\u024F''\u2019]+)/;

export function latinWordCount(text: string): number {
  return text.split(WORD_RE).filter((_, i) => i % 2 === 1).length;
}

export type WordHit = {
  word: string;
  index: number;
  element: HTMLElement;
};

export type LatinTextHandle = {
  element: HTMLElement;
  setActive: (index: number | null) => void;
};

/**
 * Build a clickable Latin paragraph. Returns a handle so a caller can later
 * toggle the active word without rebuilding the DOM.
 */
export function createLatinText(
  text: string,
  opts: { indexOffset?: number; activeIndex?: number | null; onSelect: (hit: WordHit) => void },
): LatinTextHandle {
  const parts = text.split(WORD_RE);
  const indexOffset = opts.indexOffset ?? 0;
  let wordIndex = indexOffset;
  let activeIndex = opts.activeIndex ?? null;

  const spans: HTMLSpanElement[] = [];
  const p = el("p", { className: "latin" });

  parts.forEach((part, i) => {
    if (!part) return;
    if (i % 2 === 0) {
      p.append(document.createTextNode(part));
      return;
    }
    const index = wordIndex;
    wordIndex += 1;
    const span = el("span", {
      className: index === activeIndex ? "w active" : "w",
      dataset: { word: part },
      role: "button",
      tabIndex: 0,
      aria: { pressed: index === activeIndex },
      onClick: (event: MouseEvent) => {
        event.stopPropagation();
        opts.onSelect({ word: part, index, element: span });
      },
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          opts.onSelect({ word: part, index, element: span });
        }
      },
    }, part);
    spans.push(span);
    p.append(span);
  });

  const setActive = (newIndex: number | null) => {
    activeIndex = newIndex;
    spans.forEach((span, i) => {
      const index = indexOffset + i;
      const active = index === newIndex;
      span.classList.toggle("active", active);
      span.setAttribute("aria-pressed", String(active));
    });
  };

  return { element: p, setActive };
}
