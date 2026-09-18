import { el } from "../dom";
import type { SourceLeaf, Work } from "../content/types";

/** Find the leaf metadata for a facsimile filename, if it is in this collection. */
export function leafForFacsimile(facsimile: string | null, leaves: SourceLeaf[]): SourceLeaf | undefined {
  if (!facsimile) return undefined;
  return leaves.find((leaf) => leaf.facsimile === facsimile);
}

function leafCaption(leaf: SourceLeaf): string {
  return `PL ${leaf.columns} · ${leaf.pdf}, p. ${leaf.page} · Migne Patrologia Latina`;
}

/** Inline green leaf glyph, so no image asset or icon library is needed. */
const LEAF_ICON =
  `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20.6 3.4C12.6 2.6 5 5 4.5 11.6c-.2 2.6 1 4.6 2.4 6.2-.9.2-1.8 1-2 1.9 1.4.2 2.3-.4 3-1.1 1.3 1.2 3.4 2 6 2 6.4 0 7.6-5.4 6.7-17.2z"
      fill="#3d7a3f"/>
    <path d="M5 12.5C8.5 9.5 13 8 18.5 6.6" stroke="#2c5e2a" stroke-width="1.1" stroke-linecap="round"/>
  </svg>`;

/**
 * A collapsible "source leaf" panel for a passage. Collapsed by default; the
 * heavy PNG only loads the first time the reader opens it. Works without
 * facsimiles (the Rule) render nothing. When a passage in a work that has
 * leaves is missing its image, a short note is shown instead of a broken image.
 */
export function createSourceLeaf(facsimile: string | null, work: Work): HTMLElement | null {
  if (work.source.leaves.length === 0) return null;

  const leaf = leafForFacsimile(facsimile, work.source.leaves);

  if (!leaf) {
    const note = work.source.missingFacsimileNote;
    if (!note) return null;
    return el("div", { className: "source-leaf missing" }, el("p", null, note));
  }

  const figure = el("figure", { className: "leaf-figure", hidden: true },
    el("img", {
      src: `/facsimiles/${leaf.facsimile}`,
      alt: `Migne Patrologia Latina, ${leafCaption(leaf)}`,
      loading: "lazy",
      decoding: "async",
    }),
    el("figcaption", null, leafCaption(leaf)),
  );

  let open = false;
  const button = el("button", {
    type: "button",
    className: "leaf-btn",
    "aria-label": `Show Migne leaf · PL ${leaf.columns}`,
    title: `Show Migne leaf · PL ${leaf.columns}`,
    onClick: () => {
      open = !open;
      figure.hidden = !open;
      button.classList.toggle("open", open);
      button.setAttribute("aria-label", open ? "Hide Migne leaf" : `Show Migne leaf · PL ${leaf.columns}`);
      button.setAttribute("title", open ? "Hide Migne leaf" : `Show Migne leaf · PL ${leaf.columns}`);
    },
  });
  button.innerHTML = LEAF_ICON;

  return el("div", { className: "source-leaf" }, button, figure);
}
