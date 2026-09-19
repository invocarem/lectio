import { el } from "../dom";
import type { SourceLeaf, Work } from "../content/types";
import { openLeafViewer } from "./LeafViewer";

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

const ENLARGE_ICON =
  `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

/**
 * A collapsible "source leaf" panel for a passage. Collapsed by default; the
 * heavy PNG only loads the first time the reader opens it. Works without
 * facsimiles (the Rule) render nothing. When a passage in a work that has
 * leaves is missing its image, a short note is shown instead of a broken image.
 * Tapping the image opens a fullscreen viewer that supports pinch-to-zoom.
 */
export function createSourceLeaf(facsimile: string | null, work: Work): HTMLElement | null {
  if (work.source.leaves.length === 0) return null;

  const leaf = leafForFacsimile(facsimile, work.source.leaves);

  if (!leaf) {
    const note = work.source.missingFacsimileNote;
    if (!note) return null;
    return el("div", { className: "source-leaf missing" }, el("p", null, note));
  }

  const src = `/facsimiles/${leaf.facsimile}`;
  const alt = `Migne Patrologia Latina, ${leafCaption(leaf)}`;

  const img = el("img", {
    src,
    alt,
    loading: "lazy",
    decoding: "async",
    draggable: "false",
  });

  const enlarge = el("span", { className: "leaf-enlarge", aria: { hidden: "true" } });
  enlarge.innerHTML = ENLARGE_ICON;

  const zoomBtn = el("button", {
    type: "button",
    className: "leaf-zoom-btn",
    "aria-label": "Enlarge page image. Pinch to zoom.",
    title: "Enlarge · pinch to zoom",
    onClick: () => openLeafViewer({ src, alt }),
  }, img, enlarge);

  const figure = el("figure", { className: "leaf-figure", hidden: true },
    zoomBtn,
    el("figcaption", null, `${leafCaption(leaf)} · tap to enlarge, pinch to zoom`),
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
