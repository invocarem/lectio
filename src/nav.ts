let renderRoute: () => void = () => {};

export function setRenderer(fn: () => void): void {
  renderRoute = fn;
}

export function navigate(path: string): void {
  const target = path.split("?")[0];
  if (window.location.pathname !== target) {
    history.pushState({}, "", target);
  }
  renderRoute();
}

/** Navigate without adding a history entry (e.g. invalid lectio → contents). */
export function redirect(path: string): void {
  const target = path.split("?")[0];
  history.replaceState({}, "", target);
  renderRoute();
}
