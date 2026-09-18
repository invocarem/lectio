import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { glossFor, lemmaFor, lookup, normalise, sensesFor } from "../content/dictionary";

const SHEET_MQ = "(max-width: 700px)";

type Props = {
  word: string;
  anchor: DOMRect;
  onClose: () => void;
};

function useSheet(): boolean {
  const [sheet, setSheet] = useState(
    () => typeof window !== "undefined" && window.matchMedia(SHEET_MQ).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(SHEET_MQ);
    const onChange = () => setSheet(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return sheet;
}

export function DictPopup({ word, anchor, onClose }: Props) {
  const elRef = useRef<HTMLElement>(null);
  const sheet = useSheet();
  const key = normalise(word);
  const entry = lookup(word);

  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (sheet) {
      el.style.width = "";
      el.style.left = "";
      el.style.top = "";
      return;
    }
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
  }, [anchor, word, entry, sheet]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("#dict") || target?.closest(".w")) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    if (!sheet) {
      const onScroll = () => onClose();
      window.addEventListener("scroll", onScroll, true);
      return () => {
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("click", onClick);
        window.removeEventListener("scroll", onScroll, true);
      };
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [onClose, sheet]);

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
    <>
      {sheet ? <div className="dict-backdrop" onClick={onClose} /> : null}
      <aside
        className={sheet ? "dict dict-sheet" : "dict"}
        id="dict"
        ref={elRef}
        role="dialog"
        aria-label={`Gloss for ${word}`}
      >
        {sheet ? <div className="dict-handle" aria-hidden="true" /> : null}
        <button className="dict-close" type="button" onClick={onClose} aria-label="Close glossary">
          ×
        </button>
        {body}
      </aside>
    </>
  );
}
