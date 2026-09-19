import { el } from "../dom";
import type { Child } from "../dom";
import { findChapter } from "../content/types";
import type { WorkId } from "../content/types";
import {
  cycleTheme,
  themeLabel,
  themePref,
  themeTooltip,
} from "../theme";
import {
  defaultWorkId,
  getWork,
  nextWorkId,
  workHomePath,
  workLectioPath,
  workShortLabel,
} from "../content/works";
import { readLastPosition } from "../lastPosition";
import { navigate } from "../nav";

function lectioPathFor(id: WorkId): string {
  const work = getWork(id);
  const last = readLastPosition(id);
  const chapter = last ? findChapter(work, last.chapterId) : undefined;
  if (last && chapter?.passages[last.passageIndex]) {
    return workLectioPath(id, last.chapterId, last.passageIndex);
  }
  const first = work.parts[0]?.chapters[0];
  return first ? workLectioPath(id, first.id, 0) : workHomePath(id);
}

export function createMasthead(opts: {
  workId?: WorkId;
  extra?: Child[];
} = {}): HTMLElement {
  const currentWork = opts.workId ?? defaultWorkId;
  const extras = (opts.extra ?? []).filter(Boolean);

  const workBtn = el("button", {
    type: "button",
    className: "work-toggle",
    "aria-label": "Switch work",
    title: `${getWork(currentWork).title.la}. Click for ${workShortLabel(nextWorkId(currentWork))}.`,
    text: workShortLabel(currentWork),
    onClick: () => navigate(lectioPathFor(nextWorkId(currentWork))),
  });

  const themeBtn = el("button", {
    type: "button",
    className: "theme-toggle",
    "aria-label": "Toggle light and dark theme",
    title: themeTooltip(themePref()),
    text: themeLabel(themePref()),
    onClick: () => {
      const next = cycleTheme();
      themeBtn.textContent = themeLabel(next);
      themeBtn.title = themeTooltip(next);
    },
  });

  const nav = extras.length > 0
    ? el("nav", { className: "mast-nav" }, ...extras)
    : null;

  return el("header", { className: "masthead" },
    el("a", { className: "wordmark", href: "/" }, "Lectio"),
    nav,
    el("div", { className: "mast-tools" }, workBtn, themeBtn),
  );
}
