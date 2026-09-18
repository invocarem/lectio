import { describe, expect, it } from "vitest";
import { leafForFacsimile } from "./SourceLeaf";
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
