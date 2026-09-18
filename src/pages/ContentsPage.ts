import { el } from "../dom";
import { work } from "../content/work";

export function renderContents(): HTMLElement {
  return el("div", { className: "shell" },
    el("header", { className: "masthead" },
      el("a", { className: "wordmark", href: "/" }, "Lectio"),
      el("nav", { className: "mast-nav" },
        el("a", { href: "/" }, "Home"),
      ),
    ),
    ...work.parts.map((part) =>
      el("section", { className: "part" },
        el("p", { className: "kicker" }, part.title.en),
        el("h2", null, part.title.la),
        el("ul", { className: "chapter-list" },
          ...part.chapters.map((chapter) =>
            el("li", null,
              el("a", { href: `/lectio/${chapter.id}/0` },
                el("span", { className: "num" }, chapter.caput ? `Cap. ${chapter.caput}` : "Praef."),
                el("span", null,
                  el("strong", null, chapter.title.la),
                  el("br", null),
                  el("em", null, chapter.title.en),
                ),
                el("span", { className: "pl" }, `PL ${chapter.plColumns}`),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
