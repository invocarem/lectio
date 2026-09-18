import { el } from "../dom";
import { chapterLabel, cite } from "../content/types";
import type { Work } from "../content/types";
import { workHomePath, workLectioPath } from "../content/works";
import { createMasthead } from "../components/Masthead";
import { navigate } from "../nav";

export function renderContents(work: Work): HTMLElement {
  return el("div", { className: "shell" },
    createMasthead({
      workId: work.id,
      extra: [el("a", { href: workHomePath(work.id) }, "Home")],
      onWorkChange: (id) => navigate(id ? workHomePath(id) : "/"),
    }),
    ...work.parts.map((part) =>
      el("section", { className: "part" },
        el("p", { className: "kicker" }, part.title.en),
        el("h2", null, part.title.la),
        el("ul", { className: "chapter-list" },
          ...part.chapters.map((chapter) =>
            el("li", null,
              el("a", { href: workLectioPath(work.id, chapter.id, 0) },
                el("span", { className: "num" }, chapterLabel(chapter)),
                el("span", null,
                  el("strong", null, chapter.title.la),
                  el("br", null),
                  el("em", null, chapter.title.en),
                ),
                chapter.plColumns
                  ? el("span", { className: "pl" }, cite(work, chapter.plColumns))
                  : el("span", { className: "pl" }),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
