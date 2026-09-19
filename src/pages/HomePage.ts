import { el } from "../dom";
import { allPassages, findChapter } from "../content/types";
import type { Work } from "../content/types";
import { works, workContentsPath, workHomePath, workLectioPath } from "../content/works";
import { createMasthead } from "../components/Masthead";
import { readLastPosition } from "../lastPosition";

export function renderLibrary(): HTMLElement {
  return el("div", { className: "shell" },
    createMasthead(),
    el("section", { className: "hero" },
      el("p", { className: "kicker" }, "Library"),
      el("h1", null, "Lectio"),
      el("p", { className: "lede" },
        "A quiet Latin reader. Choose a work; English sits beside the Latin for meditation. Click a Latin word for a gloss.",
      ),
    ),
    el("ul", { className: "work-list" },
      ...works.map((work) => {
        const first = allPassages(work)[0];
        const firstChapter = work.parts[0]?.chapters[0];
        const beginPath = firstChapter
          ? workLectioPath(work.id, firstChapter.id, 0)
          : workHomePath(work.id);
        return el("li", { className: "work-card" },
          el("p", { className: "kicker" }, work.author.la),
          el("h2", null, el("a", { href: workHomePath(work.id) }, work.title.la)),
          el("p", { className: "author" }, work.title.en),
          el("p", { className: "lede" }, work.lede),
          el("p", { className: "meta" },
            `${allPassages(work).length} passages · ${work.parts.flatMap((p) => p.chapters).length} chapters`,
            first?.plColumn ? ` · ${work.citePrefix} ${first.plColumn}` : "",
          ),
          el("div", { className: "actions" },
            el("a", { className: "btn", href: beginPath }, "Open the first passage"),
            el("a", { className: "btn ghost", href: workContentsPath(work.id) }, "Browse chapters"),
          ),
        );
      }),
    ),
  );
}

export function renderWorkHome(work: Work): HTMLElement {
  const first = allPassages(work)[0];
  const firstChapter = work.parts[0].chapters[0];
  const beginPath = workLectioPath(work.id, firstChapter.id, 0);

  const last = readLastPosition(work.id);
  const lastChapter = last ? findChapter(work, last.chapterId) : undefined;
  const resumePath =
    last && lastChapter && lastChapter.passages[last.passageIndex]
      ? workLectioPath(work.id, last.chapterId, last.passageIndex)
      : null;

  return el("div", { className: "shell" },
    createMasthead({
      workId: work.id,
      extra: [
        el("a", { href: workContentsPath(work.id) }, "Contents"),
        el("a", { href: beginPath }, "Begin"),
      ],
    }),
    el("section", { className: "hero" },
      el("p", { className: "kicker" }, work.author.la),
      el("h1", null, work.title.la),
      el("p", { className: "author" }, work.title.en),
      el("p", { className: "lede" }, work.lede),
      el("div", { className: "actions" },
        el("a", { className: "btn", href: beginPath }, "Open the first passage"),
        resumePath ? el("a", { className: "btn ghost", href: resumePath }, "Resume where you left off") : null,
        el("a", { className: "btn ghost", href: workContentsPath(work.id) }, "Browse chapters"),
      ),
    ),
    el("section", { className: "notes" },
      el("p", null,
        `${allPassages(work).length} passages across ${work.parts.flatMap((p) => p.chapters).length} chapters.`,
        first?.plColumn ? ` First passage: ${work.citePrefix} ${first.plColumn}.` : "",
      ),
      work.edition ? el("p", null, work.edition) : null,
      el("ul", null, ...work.source.notes.map((note) => el("li", null, note))),
    ),
  );
}
