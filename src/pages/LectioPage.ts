import { el, clear } from "../dom";
import { allChapters, chapterLabel, cite, findChapter, type Segment, type Work } from "../content/types";
import { createLatinText, latinWordCount } from "../components/LatinText";
import { createDictPopup } from "../components/DictPopup";
import { createSourceLeaf } from "../components/SourceLeaf";
import { createMasthead } from "../components/Masthead";
import { navigate } from "../nav";
import { workContentsPath, workHomePath, workLectioPath } from "../content/works";
import { saveLastPosition } from "../lastPosition";

type Mode = "both" | "la" | "en";

/** State shared across passage navigation within the lectio route. */
let mode: Mode = "both";
let stepId: string = "";
let activeDict: { destroy: () => void } | null = null;
let activeWordEl: HTMLElement | null = null;
let activeWork: Work | null = null;

/** Arrow-key targets for the current passage, refreshed each render. */
let lectioNavPrev: string | null = null;
let lectioNavNext: string | null = null;
let arrowHandler: ((e: KeyboardEvent) => void) | null = null;

/** Reset view state when leaving the lectio route (mirrors React unmount). */
export function resetLectioState(): void {
  mode = "both";
  stepId = "";
  activeWork = null;
  lectioNavPrev = null;
  lectioNavNext = null;
  if (arrowHandler) {
    document.removeEventListener("keydown", arrowHandler);
    arrowHandler = null;
  }
  closeDict();
}

/** ← / → jump between passages. Ignored while typing in a form control. */
function attachArrowNav(): void {
  if (arrowHandler) return;
  arrowHandler = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable)
    ) {
      return;
    }
    const dest =
      e.key === "ArrowLeft" ? lectioNavPrev : e.key === "ArrowRight" ? lectioNavNext : null;
    if (dest) {
      e.preventDefault();
      navigate(dest);
    }
  };
  document.addEventListener("keydown", arrowHandler);
}

function closeDict(): void {
  activeDict?.destroy();
  activeDict = null;
  activeWordEl?.classList.remove("active");
  activeWordEl = null;
}

function listSequence(work: Work) {
  return allChapters(work).flatMap((ch) =>
    ch.passages.map((passage, passageIdx) => ({ chapterId: ch.id, passageIdx, passage })),
  );
}

/** Keep chapter-picker options from inflating the masthead; titles stay full in Contents. */
function shortTitle(s: string): string {
  return s.length > 26 ? `${s.slice(0, 26).trimEnd()}…` : s;
}

export function renderLectio(work: Work, chapterId: string, passageIndex: number): HTMLElement | null {
  const chapter = findChapter(work, chapterId);
  if (!chapter) return null;
  const ch = chapter;
  const index = Number(passageIndex);
  if (Number.isNaN(index) || !ch.passages[index]) return null;

  if (activeWork?.id !== work.id || !stepId) {
    stepId = work.lectio.steps[0].id;
  }
  activeWork = work;

  const passage = ch.passages[index];
  const sequence = listSequence(work);
  const globalIndex = sequence.findIndex(
    (item) => item.chapterId === ch.id && item.passageIdx === index,
  );
  const prev = sequence[globalIndex - 1];
  const next = sequence[globalIndex + 1];
  const progress = ((globalIndex + 1) / sequence.length) * 100;

  lectioNavPrev = prev ? workLectioPath(work.id, prev.chapterId, prev.passageIdx) : null;
  lectioNavNext = next ? workLectioPath(work.id, next.chapterId, next.passageIdx) : null;
  attachArrowNav();

  saveLastPosition(work.id, ch.id, index);

  const chapterSelect = el("select", {
    className: "chapter-pick",
    "aria-label": "Chapter",
    onChange: (event: Event) => {
      const target = event.target as HTMLSelectElement;
      navigate(workLectioPath(work.id, target.value, 0));
    },
  }, ...allChapters(work).map((item) =>
    el("option", { value: item.id },
      `${chapterLabel(item)} — ${shortTitle(item.title.en)}`,
    ),
  ));
  chapterSelect.value = ch.id;

  const readerEl = el("div", { className: "reader" });

  /** Reading chunks in this passage, in display order; reset per render. */
  let subRows: HTMLElement[] = [];
  let activeSub = 0;

  function currentStep() {
    return work.lectio.steps.find((item) => item.id === stepId) ?? work.lectio.steps[0];
  }

  function buildArticle(): HTMLElement {
    const stepsEl = el("div", { className: "steps" },
      ...work.lectio.steps.map((item) =>
        el("button", {
          type: "button",
          className: `step-btn${item.id === stepId ? " active" : ""}`,
          onClick: () => {
            stepId = item.id;
            renderArticle();
          },
        }, item.la),
      ),
    );
    const promptEl = el("p", { className: "prompt" }, currentStep().prompt);

    const modeSelect = el("select", {
      value: mode,
      onChange: (event: Event) => {
        mode = (event.target as HTMLSelectElement).value as Mode;
        closeDict();
        renderArticle();
      },
    },
      el("option", { value: "both" }, "Latin and English"),
      el("option", { value: "la" }, "Latin only"),
      el("option", { value: "en" }, "English only"),
    );
    modeSelect.value = mode;

    const toolbar = el("div", { className: "toolbar" },
      el("label", null, "View ", modeSelect),
      el("span", null, `Passage ${globalIndex + 1} of ${sequence.length}`),
    );

    const passageEl = el("div", {
      className:
        `passage${passage.lacuna ? " lacuna" : ""}${mode === "both" ? " facing" : " solo"}`,
    });

    if (passage.lacuna && passage.lacunaNote) {
      passageEl.append(el("p", { className: "lacuna-note" }, passage.lacunaNote));
    }

    const segments: Segment[] = passage.segments.length
      ? passage.segments
      : [{ id: `${passage.id}.1`, la: passage.la, en: passage.en }];
    const subdivided = segments.length > 1;
    subRows = [];

    /** Small numbered chip at the start of each reading chunk; click to jump. */
    function stepMarker(si: number): HTMLElement {
      const active = si === activeSub;
      return el("button", {
        type: "button",
        className: `sub-marker${active ? " active" : ""}`,
        "aria-label": `Reading step ${si + 1} of ${segments.length}`,
        "aria-pressed": active,
        onClick: (event: MouseEvent) => {
          event.stopPropagation();
          focusSub(si);
        },
        onKeyDown: (event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            focusSub(si);
          }
        },
      }, String(si + 1));
    }

    if (mode !== "en") {
      const pageLa = el("div", { className: "page page-la" });
      if (mode === "both") pageLa.append(el("p", { className: "col-label" }, "Latina"));
      const blockEl = el("div", { className: "block" });
      let wordOffset = 0;
      segments.forEach((segment, si) => {
        const handle = createLatinText(segment.la, {
          indexOffset: wordOffset,
          onSelect: (hit) => openDict(hit.word, hit.element),
        });
        prependSectionNumber(handle.element, segment.n);
        if (subdivided) {
          const rowEl = el("span", { className: `sub${si === activeSub ? " active" : ""}` });
          rowEl.append(stepMarker(si));
          rowEl.append(handle.element);
          blockEl.append(rowEl);
          subRows.push(rowEl);
        } else {
          blockEl.append(handle.element);
        }
        wordOffset += latinWordCount(segment.la);
      });
      pageLa.append(blockEl);
      passageEl.append(pageLa);
    }

    if (mode !== "la") {
      const pageEn = el("div", { className: "page page-en" });
      if (mode === "both") pageEn.append(el("p", { className: "col-label" }, "English"));
      const blockEl = el("div", { className: "block" });
      segments.forEach((segment, si) => {
        const paragraph = el("p", { className: "english" }, segment.en);
        prependSectionNumber(paragraph, segment.n);
        if (subdivided) {
          const rowEl = el("span", { className: `sub sub-en${si === activeSub ? " active" : ""}` });
          rowEl.append(stepMarker(si));
          rowEl.append(paragraph);
          blockEl.append(rowEl);
          if (mode === "en") subRows.push(rowEl);
        } else {
          blockEl.append(paragraph);
        }
      });
      pageEn.append(blockEl);
      passageEl.append(pageEn);
    }

    const leaf = createSourceLeaf(passage.facsimile, work);

    const subNav =
      subdivided && subRows.length > 1
        ? el("div", { className: "sub-nav" },
            el("button", {
              type: "button",
              className: "sub-prev",
              "aria-label": "Previous reading step",
              disabled: activeSub === 0,
              onClick: () => focusSub(activeSub - 1),
            }, "← Prev"),
            el("span", { className: "sub-count" }, `${activeSub + 1} / ${subRows.length}`),
            el("button", {
              type: "button",
              className: "sub-next",
              "aria-label": "Next reading step",
              disabled: activeSub === subRows.length - 1,
              onClick: () => focusSub(activeSub + 1),
            }, "Next →"),
          )
        : null;

    return el("article", null,
      el("p", { className: "meta" },
        chapterLabel(ch),
        passage.n ? ` · ${passage.n}` : "",
        passage.plColumn ? ` · ${cite(work, passage.plColumn)}` : "",
      ),
      el("h2", null, ch.title.la),
      el("p", { className: "kicker" }, ch.title.en),
      stepsEl,
      promptEl,
      toolbar,
      passageEl,
      subNav,
      leaf,
      el("nav", { className: "nav-passages" },
        prev
          ? el("a", { href: workLectioPath(work.id, prev.chapterId, prev.passageIdx) }, "← Previous")
          : el("span", null),
        next
          ? el("a", { href: workLectioPath(work.id, next.chapterId, next.passageIdx) }, "Next →")
          : el("span", null, "End of this work"),
      ),
    );
  }

  /** Move the active reading chunk, rebuild, and bring it into view. */
  function focusSub(next: number) {
    const n = subRows.length;
    if (n <= 1) return;
    const target = Math.max(0, Math.min(next, n - 1));
    if (target === activeSub) return;
    activeSub = target;
    renderArticle();
    const row = subRows[activeSub];
    if (row) {
      requestAnimationFrame(() => row.scrollIntoView({ block: "center", behavior: "smooth" }));
    }
  }

  function renderArticle() {
    closeDict();
    clear(readerEl);
    readerEl.append(buildArticle());
  }

  function openDict(word: string, element: HTMLElement) {
    closeDict();
    const rect = element.getBoundingClientRect();
    element.classList.add("active");
    activeWordEl = element;
    activeDict = createDictPopup(word, rect, work.id);
  }

  const shell = el("div", { className: "shell lectio" },
    createMasthead({
      workId: work.id,
      extra: [
        el("a", { href: workContentsPath(work.id) }, "Contents"),
        chapterSelect,
      ],
      onWorkChange: (id) => navigate(id ? workHomePath(id) : "/"),
    }),
    el("div", { className: "progress", aria: { hidden: "true" } },
      el("span", { className: "progress-bar", style: { width: `${progress}%` } }),
    ),
    readerEl,
  );

  renderArticle();
  return shell;
}

/** Put a section number on the same line as the paragraph it belongs to. */
function prependSectionNumber(paragraph: HTMLElement, n?: string): void {
  if (!n) return;
  paragraph.prepend(el("span", { className: "bernard-n" }, `§${n}`), " ");
}
