import { el } from "../dom";

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const DOUBLE_TAP_MS = 280;
const DOUBLE_TAP_PX = 28;

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Keep the focal point (stage coordinates) fixed while changing scale.
 * pan is the translation of the image's center from the stage center.
 */
export function zoomAround(state: {
  scale: number;
  panX: number;
  panY: number;
  nextScale: number;
  focalX: number;
  focalY: number;
  centerX: number;
  centerY: number;
}): { scale: number; panX: number; panY: number } {
  const scale = clamp(state.nextScale, MIN_SCALE, MAX_SCALE);
  if (state.scale === 0) {
    return { scale, panX: state.panX, panY: state.panY };
  }
  const ratio = scale / state.scale;
  return {
    scale,
    panX: state.focalX - state.centerX - (state.focalX - state.centerX - state.panX) * ratio,
    panY: state.focalY - state.centerY - (state.focalY - state.centerY - state.panY) * ratio,
  };
}

let active: { close: () => void } | null = null;

/** Fullscreen facsimile viewer with pinch, pan, and double-tap zoom. */
export function openLeafViewer(opts: { src: string; alt: string }): { close: () => void } {
  active?.close();

  const img = el("img", {
    src: opts.src,
    alt: opts.alt,
    draggable: "false",
  });

  const closeBtn = el("button", {
    type: "button",
    className: "leaf-viewer-close",
    aria: { label: "Close page image" },
    onClick: (event: MouseEvent) => {
      event.stopPropagation();
      close();
    },
  }, "Close");

  const hint = el("p", { className: "leaf-viewer-hint" }, "Pinch to zoom · drag to pan");

  const stage = el("div", { className: "leaf-viewer-stage" }, img);
  const overlay = el("div", {
    className: "leaf-viewer",
    role: "dialog",
    aria: { modal: "true", label: "Page image. Pinch to zoom." },
  },
    el("div", { className: "leaf-viewer-bar" }, hint, closeBtn),
    stage,
  );

  let scale = 1;
  let panX = 0;
  let panY = 0;
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch: {
    startDist: number;
    startScale: number;
    startPanX: number;
    startPanY: number;
  } | null = null;
  let lastTap: { t: number; x: number; y: number } | null = null;
  let moved = false;

  function apply(): void {
    img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

  function stagePoint(event: PointerEvent): { x: number; y: number } {
    const rect = stage.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function center(): { x: number; y: number } {
    const rect = stage.getBoundingClientRect();
    return { x: rect.width / 2, y: rect.height / 2 };
  }

  function pointerDistance(): number {
    const pts = [...pointers.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
  }

  function pointerMid(): { x: number; y: number } {
    const pts = [...pointers.values()];
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  }

  function resetPinch(): void {
    if (pointers.size === 2) {
      pinch = {
        startDist: pointerDistance(),
        startScale: scale,
        startPanX: panX,
        startPanY: panY,
      };
    } else {
      pinch = null;
    }
  }

  function onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    stage.setPointerCapture(event.pointerId);
    const pt = stagePoint(event);
    pointers.set(event.pointerId, pt);
    moved = false;
    resetPinch();
  }

  function onPointerMove(event: PointerEvent): void {
    if (!pointers.has(event.pointerId)) return;
    event.preventDefault();
    const prev = pointers.get(event.pointerId)!;
    const next = stagePoint(event);
    pointers.set(event.pointerId, next);

    if (pointers.size === 2 && pinch && pinch.startDist > 0) {
      const mid = pointerMid();
      const c = center();
      const nextScale = pinch.startScale * (pointerDistance() / pinch.startDist);
      const zoomed = zoomAround({
        scale: pinch.startScale,
        panX: pinch.startPanX,
        panY: pinch.startPanY,
        nextScale,
        focalX: mid.x,
        focalY: mid.y,
        centerX: c.x,
        centerY: c.y,
      });
      scale = zoomed.scale;
      panX = zoomed.panX;
      panY = zoomed.panY;
      moved = true;
      apply();
      return;
    }

    if (pointers.size === 1 && scale > MIN_SCALE) {
      panX += next.x - prev.x;
      panY += next.y - prev.y;
      if (Math.hypot(next.x - prev.x, next.y - prev.y) > 2) moved = true;
      apply();
    } else if (pointers.size === 1 && Math.hypot(next.x - prev.x, next.y - prev.y) > 4) {
      moved = true;
    }
  }

  function onPointerUp(event: PointerEvent): void {
    if (!pointers.has(event.pointerId)) return;
    const pt = pointers.get(event.pointerId)!;
    pointers.delete(event.pointerId);
    resetPinch();

    if (scale < MIN_SCALE + 0.02) {
      scale = MIN_SCALE;
      panX = 0;
      panY = 0;
      apply();
    }

    if (pointers.size !== 0 || moved) return;

    const now = event.timeStamp;
    if (
      lastTap &&
      now - lastTap.t < DOUBLE_TAP_MS &&
      Math.hypot(pt.x - lastTap.x, pt.y - lastTap.y) < DOUBLE_TAP_PX
    ) {
      const c = center();
      if (scale > MIN_SCALE + 0.05) {
        scale = MIN_SCALE;
        panX = 0;
        panY = 0;
      } else {
        const zoomed = zoomAround({
          scale,
          panX,
          panY,
          nextScale: 2.4,
          focalX: pt.x,
          focalY: pt.y,
          centerX: c.x,
          centerY: c.y,
        });
        scale = zoomed.scale;
        panX = zoomed.panX;
        panY = zoomed.panY;
      }
      apply();
      lastTap = null;
      return;
    }
    lastTap = { t: now, x: pt.x, y: pt.y };
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    const rect = stage.getBoundingClientRect();
    const c = center();
    const zoomed = zoomAround({
      scale,
      panX,
      panY,
      nextScale: scale * (event.deltaY < 0 ? 1.12 : 1 / 1.12),
      focalX: event.clientX - rect.left,
      focalY: event.clientY - rect.top,
      centerX: c.x,
      centerY: c.y,
    });
    scale = zoomed.scale;
    panX = zoomed.panX;
    panY = zoomed.panY;
    if (scale === MIN_SCALE) {
      panX = 0;
      panY = 0;
    }
    apply();
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key === "Escape") close();
  }

  function close(): void {
    if (active?.close !== close) return;
    active = null;
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    document.body.classList.remove("leaf-viewer-open");
  }

  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", onPointerUp);
  stage.addEventListener("wheel", onWheel, { passive: false });
  document.addEventListener("keydown", onKey);
  document.body.classList.add("leaf-viewer-open");
  document.body.append(overlay);
  apply();

  const handle = { close };
  active = handle;
  return handle;
}
