import { describe, expect, it } from "vitest";
import { defaultWorkId, getWork, isWorkId, works } from "./works";
import { allChapters, allPassages } from "./types";

describe("works registry", () => {
  it("lists De gradibus then the Rule", () => {
    expect(works.map((work) => work.id)).toEqual(["gradibus", "rule"]);
    expect(defaultWorkId).toBe("gradibus");
  });

  it("resolves a registered work", () => {
    expect(getWork("rule").title.la).toContain("Regula");
    expect(isWorkId("gradibus")).toBe(true);
    expect(isWorkId("cantica")).toBe(false);
  });

  it("gives the Rule a prologue and 73 chapters", () => {
    const rule = getWork("rule");
    expect(allChapters(rule)).toHaveLength(74);
    expect(allChapters(rule)[0].id).toBe("rule:prologus");
    expect(allPassages(rule).length).toBeGreaterThan(70);
    expect(allPassages(rule)[0].la).toMatch(/Obsculta/);
    expect(allPassages(rule)[0].en).toMatch(/Listen/i);
  });

  it("keeps De gradibus ids unprefixed", () => {
    const chapters = allChapters(getWork("gradibus"));
    expect(chapters[0].id).toBe("praefatio");
    expect(chapters.some((chapter) => chapter.id === "caput-i")).toBe(true);
  });

  it("loads Caput I §1 from authored JSON segments", () => {
    const chapter = allChapters(getWork("gradibus")).find((item) => item.id === "caput-i");
    const passage = chapter?.passages[0];
    expect(passage?.id).toBe("caput-i-1-941-942");
    expect(passage?.segments).toHaveLength(5);
    expect(passage?.facsimile).toBe("pl-941-942.png");
    expect(passage?.la).toMatch(/^Locuturus ergo/);
    expect(passage?.la).toContain("Haec est enim");
  });
});
