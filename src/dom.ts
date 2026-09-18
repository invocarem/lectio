export type Child = Node | string | number | null | undefined | false;

export type EventMap = {
  [K in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[K]) => void;
};

export type Attrs = EventMap & {
  className?: string;
  id?: string;
  title?: string;
  href?: string;
  text?: string;
  htmlFor?: string;
  dataset?: Record<string, string>;
  role?: string;
  tabIndex?: number;
  value?: string;
  style?: Partial<CSSStyleDeclaration>;
  aria?: Record<string, string | boolean>;
} & Record<string, unknown>;

const EVENT_RE = /^on[A-Z]/;

function setAttr(el: HTMLElement, key: string, value: unknown) {
  switch (key) {
    case "className":
      el.className = String(value);
      return;
    case "text":
      el.textContent = String(value);
      return;
    case "dataset":
      Object.assign(el.dataset, value as Record<string, string>);
      return;
    case "aria":
      for (const [k, v] of Object.entries(value as Record<string, string | boolean>)) {
        el.setAttribute(`aria-${k}`, String(v));
      }
      return;
    case "value": {
      const input = el as HTMLInputElement;
      if ("value" in input) input.value = String(value);
      return;
    }
    case "tabIndex":
      (el as HTMLElement & { tabIndex: number }).tabIndex = Number(value);
      return;
    case "style":
      Object.assign(el.style, value as Partial<CSSStyleDeclaration>);
      return;
    case "htmlFor":
      el.setAttribute("for", String(value));
      return;
    default:
      if (EVENT_RE.test(key)) {
        const type = key.slice(2).toLowerCase() as keyof HTMLElementEventMap;
        el.addEventListener(type, value as EventListener);
        return;
      }
      if (typeof value === "boolean") {
        if (value) el.setAttribute(key, "");
        return;
      }
      if (value != null) el.setAttribute(key, String(value));
  }
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs | null = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    setAttr(node, key, value);
  }
  for (const child of children) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}
