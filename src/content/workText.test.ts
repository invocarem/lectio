import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assembleWork } from "./fromMarkdown";
import type { WorkMeta } from "./fromMarkdown";
import {
  assembleWorkText,
  mergeWorkText,
  ScaffoldClobberError,
  segmentBody,
  verifyWorkText,
  type WorkText,
} from "./workText";

const here = dirname(fileURLToPath(import.meta.url));
const latinMd = readFileSync(join(here, "gradibus/latin.md"), "utf8");
const englishMd = readFileSync(join(here, "gradibus/english.md"), "utf8");

const META: WorkMeta = {
  id: "gradibus",
  lede: "test",
  citePrefix: "PL",
  source: {
    latin: "x",
    english: "y",
    columnsPresent: "941–972",
    missingColumns: "",
    leaves: [],
    notes: [],
  },
  lectio: {
    steps: [{ id: "lectio", la: "Lectio", en: "Reading", prompt: "Read." }],
  },
};

function caputIFirst(text: WorkText) {
  const chapter = text.parts.flatMap((part) => part.chapters).find((item) => item.id === "caput-i");
  return chapter?.passages[0];
}

describe("assembleWorkText", () => {
  it("zips De gradibus into a text tree with stable passage ids", () => {
    const text = assembleWorkText(latinMd, englishMd);
    expect(text.title.la).toContain("De Gradibus");
    expect(text.parts[0].id).toBe("humility");
    const passage = caputIFirst(text);
    expect(passage?.id).toBe("caput-i-1-941-942");
    expect(passage?.segments.length).toBeGreaterThanOrEqual(1);
    expect(passage?.segments[0].la).toMatch(/^Locuturus ergo/);
    expect(passage?.segments[0].n).toBe("1");
  });

  it("gives combined §24–25 two segments, one per Bernard section", () => {
    const text = assembleWorkText(latinMd, englishMd);
    const passage = text.parts
      .flatMap((part) => part.chapters)
      .flatMap((chapter) => chapter.passages)
      .find((item) => item.id.includes("24-25"));
    expect(passage?.segments.map((segment) => segment.n)).toEqual(["24", "25"]);
  });
});

describe("verifyWorkText", () => {
  it("accepts a lossless scaffold of the real treatises", () => {
    const text = assembleWorkText(latinMd, englishMd);
    expect(verifyWorkText(text, latinMd, englishMd)).toEqual([]);
  });

  it("reports a Latin concat mismatch", () => {
    const text = assembleWorkText(latinMd, englishMd);
    const passage = caputIFirst(text)!;
    passage.segments[0] = { ...passage.segments[0], la: "Not the treatise." };
    const issues = verifyWorkText(text, latinMd, englishMd);
    expect(issues.some((issue) => issue.passageId === passage.id && issue.lang === "la")).toBe(true);
  });
});

describe("mergeWorkText", () => {
  it("keeps a hand split that still matches the markdown", () => {
    const scaffold = assembleWorkText(latinMd, englishMd);
    const passage = caputIFirst(scaffold)!;
    const body = passage.segments[0].la;
    const cut = body.indexOf(" Proponat ");
    const hand: WorkText = structuredClone(scaffold);
    const target = caputIFirst(hand)!;
    target.segments = [
      { id: `${target.id}.1`, n: "1", la: body.slice(0, cut).trim(), en: target.segments[0].en },
      { id: `${target.id}.2`, la: body.slice(cut).trim(), en: "" },
    ];
    // Put all English on the first segment so concat still matches.
    const merged = mergeWorkText(hand, scaffold, false);
    const kept = caputIFirst(merged)!;
    expect(kept.segments).toHaveLength(2);
    expect(kept.segments[0].la).toBe(body.slice(0, cut).trim());
  });

  it("refuses to clobber a hand split that no longer matches", () => {
    const scaffold = assembleWorkText(latinMd, englishMd);
    const hand = structuredClone(scaffold);
    const target = caputIFirst(hand)!;
    target.segments = [
      { id: `${target.id}.1`, n: "1", la: "Wrong.", en: target.segments[0].en },
    ];
    // Make it look hand-split: two segments, not all with n.
    target.segments.push({ id: `${target.id}.2`, la: "Also wrong.", en: "" });
    expect(() => mergeWorkText(hand, scaffold, false)).toThrow(ScaffoldClobberError);
  });

  it("overwrites a stale hand split when forced", () => {
    const scaffold = assembleWorkText(latinMd, englishMd);
    const hand = structuredClone(scaffold);
    const target = caputIFirst(hand)!;
    target.segments = [
      { id: `${target.id}.1`, n: "1", la: "Wrong.", en: "Wrong." },
      { id: `${target.id}.2`, la: "Also wrong.", en: "" },
    ];
    const merged = mergeWorkText(hand, scaffold, true);
    expect(caputIFirst(merged)?.segments[0].la).toMatch(/^Locuturus ergo/);
    expect(segmentBody(caputIFirst(merged)!.segments, "la")).toBe(
      segmentBody(caputIFirst(scaffold)!.segments, "la"),
    );
  });
});

describe("assembleWork segments", () => {
  it("strips § markers from passage bodies and keeps them on the segment", () => {
    const work = assembleWork(latinMd, englishMd, META);
    const chapter = work.parts.flatMap((part) => part.chapters).find((item) => item.id === "caput-i");
    const passage = chapter?.passages[0];
    expect(passage?.la.startsWith("§")).toBe(false);
    expect(passage?.segments[0].n).toBe("1");
    expect(passage?.la).toMatch(/^Locuturus ergo/);
  });
});

describe("gradibus/work.json", () => {
  it("is a lossless encoding of the markdown, with Caput I §1 hand-split", () => {
    const json = JSON.parse(readFileSync(join(here, "gradibus/work.json"), "utf8")) as WorkText;
    expect(verifyWorkText(json, latinMd, englishMd)).toEqual([]);
    const passage = caputIFirst(json)!;
    expect(passage.segments).toHaveLength(5);
    expect(passage.segments[0].n).toBe("1");
    expect(passage.segments.slice(1).every((segment) => segment.n === undefined)).toBe(true);
    expect(passage.segments[0].la).toMatch(/^Locuturus ergo/);
    expect(passage.segments[4].la).toMatch(/^Haec est enim/);
    expect(passage.segments[0].en).toMatch(/^I am about to speak/);
    expect(passage.segments[4].en).toMatch(/^For this, he says/);
  });

  it("survives a re-scaffold without clobbering the Caput I split", () => {
    const existing = JSON.parse(readFileSync(join(here, "gradibus/work.json"), "utf8")) as WorkText;
    const merged = mergeWorkText(existing, assembleWorkText(latinMd, englishMd), false);
    expect(caputIFirst(merged)?.segments).toHaveLength(5);
    expect(verifyWorkText(merged, latinMd, englishMd)).toEqual([]);
  });
});
