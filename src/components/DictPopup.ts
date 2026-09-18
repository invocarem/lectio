import { el } from "../dom";
import { glossFor, lemmaFor, lookup, normalise, sensesFor } from "../content/dictionary";
import type { WorkId } from "../content/types";

const SHEET_MQ = "(max-width: 700px)";

function isSheet(): boolean {
  return typeof window !== "undefined" && window.matchMedia(SHEET_MQ).matches;
}

export type DictPopupHandle = {
  element: HTMLElement;
  destroy: () => void;
};

/**
 * Build a dictionary popup positioned relative to an anchor rect and append it
 * to the DOM. Returns a handle; the caller must call `destroy` to remove it and
 * its listeners.
 */
export function createDictPopup(word: string, anchor: DOMRect, workId: WorkId = "gradibus"): DictPopupHandle {
  const sheet = isSheet();
  const key = normalise(word);
  const entry = lookup(word, workId);

  const panel = el("aside", {
    id: "dict",
    role: "dialog",
    className: sheet ? "dict dict-sheet" : "dict",
    aria: { label: `Gloss for ${word}` },
  });

  let body: HTMLElement;
  if (!entry) {
    body = el("div", { className: "dict-empty" }, "No dictionary entry for ", el("em", null, key), ".");
  } else {
    const lemma = lemmaFor(entry);
    const pos = entry.edited?.pos ?? entry.senses?.[0]?.pos ?? entry.pos?.[0] ?? "";
    const extra = sensesFor(entry);
    const count = entry.count != null ? `${entry.count}× in this work` : "";
    const head = el("div", { className: "dict-head" },
      el("span", { className: "dict-word" }, entry.key),
      pos ? el("span", { className: "dict-pos" }, pos) : null,
      entry.edited ? el("span", { className: "curated-tag" }, "curated") : null,
    );
    const lemmaEl = el("div", { className: "dict-lemma" }, lemma, count ? ` · ${count}` : "");
    const gloss = el("p", { className: "dict-gloss" }, glossFor(entry));
    const note = entry.edited?.note ? el("p", { className: "dict-note" }, entry.edited.note) : null;
    const more =
      extra.length > 1
        ? el("details", { className: "dict-more" },
            el("summary", null, `${extra.length} Whitaker senses`),
            ...extra.map((sense) => el("p", null, sense)),
          )
        : null;
    body = el("div", null, head, lemmaEl, gloss, note, more);
  }

  const closeBtn = el("button", {
    className: "dict-close",
    type: "button",
    aria: { label: "Close glossary" },
    onClick: () => destroy(),
  }, "×");

  if (sheet) {
    panel.append(el("div", { className: "dict-handle", aria: { hidden: "true" } }));
  }
  panel.append(closeBtn, body);

  const backdrop = sheet ? el("div", { className: "dict-backdrop", onClick: () => destroy() }) : null;

  let destroyed = false;
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("click", onDocClick);
    if (!sheet) window.removeEventListener("scroll", onScroll, true);
    backdrop?.remove();
    panel.remove();
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === "Escape") destroy();
  }
  function onDocClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest("#dict") || target?.closest(".w")) return;
    destroy();
  }
  function onScroll() {
    destroy();
  }

  function position() {
    if (sheet) return;
    const margin = 10;
    const width = Math.min(360, window.innerWidth - margin * 2);
    let left = Math.max(margin, Math.min(anchor.left, window.innerWidth - width - margin));
    let top = anchor.bottom + margin;
    const height = panel.offsetHeight || 220;
    if (top + height > window.innerHeight - margin) {
      top = Math.max(margin, anchor.top - height - margin);
    }
    panel.style.width = `${width}px`;
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  if (backdrop) document.body.append(backdrop);
  document.body.append(panel);
  position();

  document.addEventListener("keydown", onKey);
  document.addEventListener("click", onDocClick);
  if (!sheet) window.addEventListener("scroll", onScroll, true);

  return { element: panel, destroy };
}
