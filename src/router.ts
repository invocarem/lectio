import { clear } from "./dom";
import { renderLibrary, renderWorkHome } from "./pages/HomePage";
import { renderContents } from "./pages/ContentsPage";
import { renderLectio, resetLectioState } from "./pages/LectioPage";
import { defaultWorkId, getWork, isWorkId, workContentsPath, workHomePath, workLectioPath } from "./content/works";
import type { WorkId } from "./content/types";
import { navigate, redirect, setRenderer } from "./nav";

export type Route =
  | { name: "library" }
  | { name: "work"; workId: WorkId }
  | { name: "contents"; workId: WorkId }
  | { name: "lectio"; workId: WorkId; chapterId: string; passageIndex: number };

export { navigate, redirect };

function parsePath(path: string): Route {
  const segments = path.split("?")[0].split("/").filter(Boolean);
  if (segments.length === 0) return { name: "library" };

  // Legacy single-work URLs, kept so old bookmarks still open De gradibus.
  if (segments[0] === "contents") return { name: "contents", workId: defaultWorkId };
  if (segments[0] === "lectio") {
    const chapterId = segments[1] ?? "";
    const passageIndex = Number(segments[2]) || 0;
    return { name: "lectio", workId: defaultWorkId, chapterId, passageIndex };
  }

  if (!isWorkId(segments[0])) return { name: "library" };
  const workId = segments[0];
  if (segments.length === 1) return { name: "work", workId };
  if (segments[1] === "contents") return { name: "contents", workId };
  if (segments[1] === "lectio") {
    const chapterId = segments[2] ?? "";
    const passageIndex = Number(segments[3]) || 0;
    return { name: "lectio", workId, chapterId, passageIndex };
  }
  return { name: "work", workId };
}

function canonicalPath(route: Route): string {
  switch (route.name) {
    case "library":
      return "/";
    case "work":
      return workHomePath(route.workId);
    case "contents":
      return workContentsPath(route.workId);
    case "lectio":
      return workLectioPath(route.workId, route.chapterId, route.passageIndex);
  }
}

let root = document.getElementById("root")!;
let lastRouteName: Route["name"] | null = null;

function pageTitle(route: Route): string {
  if (route.name === "library") return "Lectio";
  const work = getWork(route.workId);
  if (route.name === "work") return `Lectio — ${work.title.la}`;
  if (route.name === "contents") return `Lectio — ${work.title.la} — Contents`;
  return `Lectio — ${work.title.la}`;
}

export function render(): void {
  const parsed = parsePath(window.location.pathname);
  const canonical = canonicalPath(parsed);
  if (window.location.pathname !== canonical) {
    history.replaceState({}, "", canonical);
  }
  const route = parsePath(window.location.pathname);

  if (lastRouteName !== "lectio") {
    resetLectioState();
  }
  lastRouteName = route.name;

  document.title = pageTitle(route);

  let node: Node;
  switch (route.name) {
    case "library":
      node = renderLibrary();
      break;
    case "work":
      node = renderWorkHome(getWork(route.workId));
      break;
    case "contents":
      node = renderContents(getWork(route.workId));
      break;
    case "lectio": {
      const lectio = renderLectio(getWork(route.workId), route.chapterId, route.passageIndex);
      if (lectio === null) {
        redirect(workContentsPath(route.workId));
        return;
      }
      node = lectio;
      break;
    }
  }
  clear(root);
  root.append(node);
  window.scrollTo(0, 0);
}

export function initRouter(): void {
  root = document.getElementById("root")!;
  setRenderer(render);
  window.addEventListener("popstate", render);
  document.addEventListener("click", (event) => {
    const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href || !href.startsWith("/") || href.startsWith("//")) return;
    event.preventDefault();
    navigate(href);
  });
  render();
}
