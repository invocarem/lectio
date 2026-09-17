import { Fragment, type KeyboardEvent, type MouseEvent } from "react";

/** Word-token boundary (Latin letters, incl. accented, plus apostrophes). */
const WORD_RE = /([A-Za-z\u00C0-\u024F''\u2019]+)/;

export type WordHit = {
  word: string;
  index: number;
  element: HTMLElement;
};

type Props = {
  text: string;
  activeIndex: number | null;
  onSelect: (hit: WordHit) => void;
};

export function LatinText({ text, activeIndex, onSelect }: Props) {
  const parts = text.split(WORD_RE);
  let wordIndex = 0;

  return (
    <p className="latin">
      {parts.map((part, i) => {
        if (!part) return null;
        if (i % 2 === 0) {
          return <Fragment key={i}>{part}</Fragment>;
        }
        const index = wordIndex;
        wordIndex += 1;
        const active = index === activeIndex;
        return (
          <span
            key={`${index}-${part}`}
            className={active ? "w active" : "w"}
            data-word={part}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            onClick={(event: MouseEvent<HTMLElement>) => {
              event.stopPropagation();
              onSelect({ word: part, index, element: event.currentTarget });
            }}
            onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onSelect({ word: part, index, element: event.currentTarget });
              }
            }}
          >
            {part}
          </span>
        );
      })}
    </p>
  );
}
