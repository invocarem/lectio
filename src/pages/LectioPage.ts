import { el, clear } from "../dom";
import { allChapters, findChapter } from "../content/types";
import { splitPassageBlocks } from "../content/fromMarkdown";
import { createLatinText, latinWordCount } from "../components/LatinText";
import { createDictPopup } from "../components/DictPopup";
import { navigate } from "../router";
import { work } from "../content/work";

const STORAGE_KEY = "lectio:last";

type Mode = "both" | "la" | "en";

/** State shared across passage navigation within the lectio route. */
let mode: Mode = "both";
let stepId: string = work.lectio.steps[0].id;
let activeDict: { destroy: () => void } | null = null;
let activeWordEl: HTMLElement | null = null;

/** Reset view state when leaving the lectio route (mirrors React unmount). */
export function resetLectioState(): void {
  mode = "both";
  stepId = work.lectio.steps[0].id;
  closeDict();
}

function closeDict(): void {
  activeDict?.destroy();
  activeDict = null;
  activeWordEl?.classList.remove("active");
  activeWordEl = null;
}

function listSequence() {
  return allChapters(work).flatMap((ch) =>
    ch.passages.map((passage, passageIdx) => ({ chapterId: ch.id, passageIdx, passage })),
  );
}

export function renderLectio(chapterId: string, passageIndex: number): HTMLElement | null {
  const chapter = findChapter(work, chapterId);
  if (!chapter) return null;
  const ch = chapter;
  const index = Number(passageIndex);
  if (Number.isNaN(index) || !ch.passages[index]) return null;

  const passage = ch.passages[index];
  const sequence = listSequence();
  const globalIndex = sequence.findIndex(
    (item) => item.chapterId === ch.id && item.passageIdx === index,
  );
  const prev = sequence[globalIndex - 1];
  const next = sequence[globalIndex + 1];
  const progress = ((globalIndex + 1) / sequence.length) * 100;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ chapterId: ch.id, index }));
  } catch {
    /* ignore */
  }

  // --- Masthead ---
  const chapterSelect = el("select", {
    "aria-label": "Chapter",
    onChange: (event: Event) => {
      const target = event.target as HTMLSelectElement;
      navigate(`/lectio/${target.value}/0`);
    },
  }, ...allChapters(work).map((item) =>
    el("option", { value: item.id },
      `${item.caput ? `Cap. ${item.caput}` : "Praefatio"} — ${item.title.en}`,
    ),
  ));
  chapterSelect.value = ch.id;

  const readerEl = el("div", { className: "reader" });

  // --- Article building (rebuilt on mode changes) ---
  function buildArticle(): HTMLElement {
    const laBlocks = splitPassageBlocks(passage.la);
    const enBlocks = splitPassageBlocks(passage.en);

    // Steps
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

    // Toolbar
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

    // Passage
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
        if (block.n) blockEl.append(el("p", { className: "bernard-n" }, `§${block.n}`));
        const handle = createLatinText(block.text, {
          indexOffset: wordOffset,
          onSelect: (hit) => openDict(chapterId, index, hit.word, hit.element),
        });
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
        if (block.n) blockEl.append(el("p", { className: "bernard-n" }, `§${block.n}`));
        blockEl.append(el("p", { className: "english" }, block.text));
        pageEn.append(blockEl);
      });
      passageEl.append(pageEn);
    }

    return el("article", null,
      el("p", { className: "meta" },
        ch.caput ? `Caput ${ch.caput}` : "Praefatio",
        passage.n ? ` · ${passage.n}` : "",
        ` · PL ${passage.plColumn}`,
      ),
      el("h2", null, ch.title.la),
      el("p", { className: "kicker" }, ch.title.en),
      stepsEl,
      promptEl,
      toolbar,
      passageEl,
      el("nav", { className: "nav-passages" },
        prev
          ? el("a", { href: `/lectio/${prev.chapterId}/${prev.passageIdx}` }, "← Previous")
          : el("span", null),
        next
          ? el("a", { href: `/lectio/${next.chapterId}/${next.passageIdx}` }, "Next →")
          : el("span", null, "End of the treatise"),
      ),
    );
  }

  function renderArticle() {
    clear(readerEl);
    readerEl.append(buildArticle());
  }

  function openDict(chId: string, idx: number, word: string, element: HTMLElement) {
    closeDict();
    const rect = element.getBoundingClientRect();
    element.classList.add("active");
    activeWordEl = element;
    activeDict = createDictPopup(word, rect);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ chapterId: chId, index: idx }));
    } catch {
      /* ignore */
    }
  }

  const shell = el("div", { className: "shell lectio" },
    el("header", { className: "masthead" },
      el("a", { className: "wordmark", href: "/" }, "Lectio"),
      el("nav", { className: "mast-nav" },
        el("a", { href: "/contents" }, "Contents"),
        chapterSelect,
      ),
    ),
    el("div", { className: "progress", aria: { hidden: "true" } },
      el("span", { className: "progress-bar", style: { width: `${progress}%` } }),
    ),
    readerEl,
  );

  renderArticle();
  return shell;
}

function currentStep() {
  return work.lectio.steps.find((item) => item.id === stepId) ?? work.lectio.steps[0];
}
