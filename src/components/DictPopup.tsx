import { useEffect, useLayoutEffect, useRef } from "react";
import { glossFor, lemmaFor, lookup, normalise, sensesFor } from "../content/dictionary";

type Props = {
  word: string;
  anchor: DOMRect;
  onClose: () => void;
};

export function DictPopup({ word, anchor, onClose }: Props) {
  const elRef = useRef<HTMLElement>(null);
  const key = normalise(word);
  const entry = lookup(word);

  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const margin = 10;
    const width = Math.min(360, window.innerWidth - margin * 2);
    let left = Math.max(margin, Math.min(anchor.left, window.innerWidth - width - margin));
    let top = anchor.bottom + margin;
    const height = el.offsetHeight || 220;
    if (top + height > window.innerHeight - margin) {
      top = Math.max(margin, anchor.top - height - margin);
    }
    el.style.width = `${width}px`;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [anchor, word, entry]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("#dict") || target?.closest(".w")) return;
      onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  let body;
  if (!entry) {
    body = (
      <div className="dict-empty">
        No dictionary entry for <em>{key}</em>.
      </div>
    );
  } else {
    const lemma = lemmaFor(entry);
    const pos = entry.edited?.pos ?? entry.senses?.[0]?.pos ?? entry.pos?.[0] ?? "";
    const extra = sensesFor(entry);
    const count = entry.count != null ? `${entry.count}× in this treatise` : "";
    body = (
      <>
        <div className="dict-head">
          <span className="dict-word">{entry.key}</span>
          {pos ? <span className="dict-pos">{pos}</span> : null}
          {entry.edited ? <span className="curated-tag">curated</span> : null}
        </div>
        <div className="dict-lemma">
          {lemma}
          {count ? ` · ${count}` : ""}
        </div>
        <p className="dict-gloss">{glossFor(entry)}</p>
        {entry.edited?.note ? <p className="dict-note">{entry.edited.note}</p> : null}
        {extra.length > 1 ? (
          <details className="dict-more">
            <summary>{extra.length} Whitaker senses</summary>
            {extra.map((sense, i) => (
              <p key={`${i}-${sense}`}>{sense}</p>
            ))}
          </details>
        ) : null}
      </>
    );
  }

  return (
    <aside className="dict" id="dict" ref={elRef} role="dialog" aria-label={`Gloss for ${word}`}>
      <button className="dict-close" type="button" onClick={onClose} aria-label="Close glossary">
        ×
      </button>
      {body}
    </aside>
  );
}
