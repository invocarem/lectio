import { describe, expect, it } from "vitest";
import { leafForFacsimile } from "./SourceLeaf";
import { clamp, clampPan, zoomAround } from "./LeafViewer";
import { getWork } from "../content/works";

const leaves = getWork("gradibus").source.leaves;

describe("leafForFacsimile", () => {
  it("resolves a facsimile filename to its leaf metadata", () => {
    const leaf = leafForFacsimile("pl-941-942.png", leaves);
    expect(leaf).toBeDefined();
    expect(leaf?.columns).toBe("941–942");
    expect(leaf?.pdf).toMatch(/^MLT_/);
  });

  it("returns undefined for a filename not in the collection", () => {
    expect(leafForFacsimile("pl-945-946.png", leaves)).toBeUndefined();
  });

  it("returns undefined when there is no facsimile", () => {
    expect(leafForFacsimile(null, leaves)).toBeUndefined();
  });
});

describe("zoomAround", () => {
  it("clamps scale to the allowed range", () => {
    expect(clamp(0.2, 1, 6)).toBe(1);
    expect(clamp(9, 1, 6)).toBe(6);
  });

  it("keeps the focal point fixed when zooming from the center", () => {
    const next = zoomAround({
      scale: 1,
      panX: 0,
      panY: 0,
      nextScale: 2,
      focalX: 200,
      focalY: 150,
      centerX: 200,
      centerY: 150,
    });
    expect(next.scale).toBe(2);
    expect(next.panX).toBe(0);
    expect(next.panY).toBe(0);
  });

  it("shifts pan so an off-center focal point stays put", () => {
    const next = zoomAround({
      scale: 1,
      panX: 0,
      panY: 0,
      nextScale: 2,
      focalX: 300,
      focalY: 150,
      centerX: 200,
      centerY: 150,
    });
    expect(next.panX).toBe(-100);
    expect(next.panY).toBe(0);
  });
});

describe("clampPan", () => {
  it("resets pan at 1x because the image already fills the stage", () => {
    expect(clampPan({ scale: 1, panX: 40, panY: -12, width: 200, height: 150 })).toEqual({
      panX: 0,
      panY: 0,
    });
  });

  it("keeps pan inside the extra size created by zoom", () => {
    expect(clampPan({ scale: 2, panX: 400, panY: -80, width: 200, height: 100 })).toEqual({
      panX: 100,
      panY: -50,
    });
  });
});
