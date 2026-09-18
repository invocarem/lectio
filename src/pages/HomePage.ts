import { el } from "../dom";
import { work } from "../content/work";
import { allPassages } from "../content/types";

export function renderHome(): HTMLElement {
  const first = allPassages(work)[0];
  const firstChapter = work.parts[0].chapters[0];
  const beginPath = `/lectio/${firstChapter.id}/0`;

  return el("div", { className: "shell" },
    el("header", { className: "masthead" },
      el("a", { className: "wordmark", href: "/" }, "Lectio"),
      el("nav", { className: "mast-nav" },
        el("a", { href: "/contents" }, "Contents"),
        el("a", { href: beginPath }, "Begin"),
      ),
    ),
    el("section", { className: "hero" },
      el("p", { className: "kicker" }, work.author.la),
      el("h1", null, work.title.la),
      el("p", { className: "author" }, work.title.en),
      el("p", { className: "lede" },
        "A quiet reader for Bernard of Clairvaux’s treatise on the twelve steps of humility and pride. The Latin is transcribed from the Migne pages you supplied; English sits beside it for meditation, not as a substitute recension. Click a Latin word for a gloss.",
      ),
      el("div", { className: "actions" },
        el("a", { className: "btn", href: beginPath }, "Open the first passage"),
        el("a", { className: "btn ghost", href: "/contents" }, "Browse chapters"),
      ),
    ),
    el("section", { className: "notes" },
      el("p", null,
        `${allPassages(work).length} passages across ${work.parts.flatMap((p) => p.chapters).length} chapters. First leaf: ${first.plColumn}.`,
      ),
      el("ul", null, ...work.source.notes.map((note) => el("li", null, note))),
      el("p", null,
        "953–954: ",
        el("code", null, "MLT_1-4"),
        " page 3.",
        work.source.missingColumns
          ? ` Missing from the scans: columns ${work.source.missingColumns}.`
          : " Columns 945–946 have no facsimile; the Latin is supplied from Migne.",
      ),
    ),
  );
}
