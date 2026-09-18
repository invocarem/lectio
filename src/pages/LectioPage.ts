import { el, clear } from "../dom";
import { allChapters, chapterLabel, cite, findChapter } from "../content/types";
import type { Work } from "../content/types";
import { splitPassageBlocks } from "../content/fromMarkdown";
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

/** Reset view state when leaving the lectio route (mirrors React unmount). */
export function resetLectioState(): void {
  mode = "both";
  stepId = "";
  activeWork = null;
  closeDict();
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

  saveLastPosition(work.id, ch.id, index);

  const chapterSelect = el("select", {
    "aria-label": "Chapter",
    onChange: (event: Event) => {
      const target = event.target as HTMLSelectElement;
      navigate(workLectioPath(work.id, target.value, 0));
    },
  }, ...allChapters(work).map((item) =>
    el("option", { value: item.id },
      `${chapterLabel(item)} — ${item.title.en}`,
    ),
  ));
  chapterSelect.value = ch.id;

  const readerEl = el("div", { className: "reader" });

  function currentStep() {
    return work.lectio.steps.find((item) => item.id === stepId) ?? work.lectio.steps[0];
  }

  function buildArticle(): HTMLElement {
    const laBlocks = splitPassageBlocks(passage.la);
    const enBlocks = splitPassageBlocks(passage.en);

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
      mode !== "en"
        ? el("span", { className: "hint" }, "Click a Latin word for a gloss.")
        : el("span", null),
    );

    const passageEl = el("div", {
      className:
        `passage${passage.lacuna ? " lacuna" : ""}${mode === "both" ? " facing" : " solo"}`,
    });

    if (passage.lacuna && passage.lacunaNote) {
      passageEl.append(el("p", { className: "lacuna-note" }, passage.lacunaNote));
    }

    if (mode !== "en") {
      const pageLa = el("div", { className: "page page-la" });
      if (mode === "both") pageLa.append(el("p", { className: "col-label" }, "Latina"));
      let wordOffset = 0;
      laBlocks.forEach((block) => {
        const blockEl = el("div", { className: "block" });
        const handle = createLatinText(block.text, {
          indexOffset: wordOffset,
          onSelect: (hit) => openDict(hit.word, hit.element),
        });
        prependSectionNumber(handle.element, block.n);
        blockEl.append(handle.element);
        pageLa.append(blockEl);
        wordOffset += latinWordCount(block.text);
      });
      passageEl.append(pageLa);
    }

    if (mode !== "la") {
      const pageEn = el("div", { className: "page page-en" });
      if (mode === "both") pageEn.append(el("p", { className: "col-label" }, "English"));
      enBlocks.forEach((block) => {
        const blockEl = el("div", { className: "block" });
        const paragraph = el("p", { className: "english" }, block.text);
        prependSectionNumber(paragraph, block.n);
        blockEl.append(paragraph);
        pageEn.append(blockEl);
      });
      passageEl.append(pageEn);
    }

    const leaf = createSourceLeaf(passage.facsimile, work);

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
