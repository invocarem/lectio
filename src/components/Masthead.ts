import { el } from "../dom";
import type { Child } from "../dom";
import { works } from "../content/works";
import type { WorkId } from "../content/types";

export function createMasthead(opts: {
  workId?: WorkId;
  extra?: Child[];
  onWorkChange: (workId: WorkId | undefined) => void;
}): HTMLElement {
  const select = el("select", {
    "aria-label": "Work",
    onChange: (event: Event) => {
      const value = (event.target as HTMLSelectElement).value;
      opts.onWorkChange(value ? (value as WorkId) : undefined);
    },
  },
    el("option", { value: "" }, "All works"),
    ...works.map((work) => el("option", { value: work.id }, work.title.en)),
  );
  select.value = opts.workId ?? "";

  return el("header", { className: "masthead" },
    el("a", { className: "wordmark", href: "/" }, "Lectio"),
    el("nav", { className: "mast-nav" },
      el("label", { className: "work-pick" }, "Work ", select),
      ...(opts.extra ?? []),
    ),
  );
}
