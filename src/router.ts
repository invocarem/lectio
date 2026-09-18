import { clear } from "./dom";
import { renderHome } from "./pages/HomePage";
import { renderContents } from "./pages/ContentsPage";
import { renderLectio, resetLectioState } from "./pages/LectioPage";

export type Route =
  | { name: "home" }
  | { name: "contents" }
  | { name: "lectio"; chapterId: string; passageIndex: number };

function parsePath(path: string): Route {
  const segments = path.split("?")[0].split("/").filter(Boolean);
  if (segments.length === 0) return { name: "home" };
  if (segments[0] === "contents") return { name: "contents" };
  if (segments[0] === "lectio") {
    const chapterId = segments[1] ?? "";
    const passageIndex = Number(segments[2]) || 0;
    return { name: "lectio", chapterId, passageIndex };
  }
  return { name: "home" };
}

let root = document.getElementById("root")!;
let lastRouteName: Route["name"] | null = null;

export function navigate(path: string): void {
  const target = path.split("?")[0];
  if (window.location.pathname !== target) {
    history.pushState({}, "", target);
  }
  render();
}

/** Navigate without adding a history entry (e.g. invalid lectio → contents). */
export function redirect(path: string): void {
  const target = path.split("?")[0];
  history.replaceState({}, "", target);
  render();
}

export function render(): void {
  const route = parsePath(window.location.pathname);

  // Reset lectio view state whenever a fresh lectio page is entered (or any
  // non-lectio page), mirroring React's unmount/remount behaviour.
  if (lastRouteName !== "lectio") {
    resetLectioState();
  }
  lastRouteName = route.name;

  let node: Node;
  switch (route.name) {
    case "home":
      node = renderHome();
      break;
    case "contents":
      node = renderContents();
      break;
    case "lectio": {
      const lectio = renderLectio(route.chapterId, route.passageIndex);
      if (lectio === null) {
        history.replaceState({}, "", "/contents");
        node = renderContents();
        break;
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
  window.addEventListener("popstate", render);
  document.addEventListener("click", (event) => {
    const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href || !href.startsWith("/") || href.startsWith("//")) return;
    const target = parsePath(href);
    if (target.name === "home" || href === "/") {
      event.preventDefault();
      navigate(href);
      return;
    }
    if (target.name === "contents" || target.name === "lectio") {
      event.preventDefault();
      navigate(href);
    }
  });
  render();
}
