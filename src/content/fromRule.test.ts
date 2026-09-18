import { describe, expect, it } from "vitest";
import { assembleRuleChapters, parseRuleMarkdown, type RuleRendering } from "./fromRule";

const LATIN = [
  "# Regula Sancti Benedicti",
  "*Working Latin from The Latin Library.*",
  "---",
  "",
  "## Prologus",
  "1. Obsculta, o fili, praecepta magistri.",
  "2. Exurgamus ergo tandem.",
  "---",
  "",
  "## Capitulum 1",
  "1. Monachorum quattuor esse genera.",
  "2. Tertium vero monachorum teterrimum genus.",
  "---",
  "",
  "## Capitulum 7",
  "1. Clamat nobis Scriptura divina.",
].join("\n");

const RENDERING: RuleRendering = {
  source: "Verheyen",
  titles: {
    "1": "Of the Kinds or the Life of Monks",
    "7": "Of Humility",
  },
  chapters: {
    prologus: {
      "1": "Listen, O my son.",
      "2": "Let us then rise.",
    },
    "1": {
      "1": "It is well known that there are four kinds of monks.",
      "2": "But the fourth class of monks.",
    },
    "7": {
      "1": "The Holy Scripture crieth to us.",
    },
  },
};

describe("parseRuleMarkdown", () => {
  it("parses title, source, prologue and numbered chapters", () => {
    const doc = parseRuleMarkdown(LATIN);
    expect(doc.title).toBe("Regula Sancti Benedicti");
    expect(doc.source).toContain("Latin Library");
    expect(doc.chapters.map((c) => c.heading)).toEqual(["Prologus", "Capitulum 1", "Capitulum 7"]);
    expect(doc.chapters[0].number).toBeUndefined();
    expect(doc.chapters[1].number).toBe(1);
    expect(doc.chapters[0].paragraphs).toHaveLength(2);
    expect(doc.chapters[1].paragraphs[0].text).toContain("Monachorum");
  });

  it("throws when there are no chapters", () => {
    expect(() => parseRuleMarkdown("# Title\n\n*source*\n")).toThrow(/no chapters/);
  });
});

describe("assembleRuleChapters", () => {
  it("zips Latin with Verheyen titles and paragraphs", () => {
    const chapters = assembleRuleChapters(LATIN, RENDERING);
    expect(chapters.map((c) => c.id)).toEqual(["rule:prologus", "rule:1", "rule:7"]);
    expect(chapters[0].label).toBe("Prol.");
    expect(chapters[1].title.en).toBe("Of the Kinds or the Life of Monks");
    expect(chapters[1].passages[0].en).toContain("four kinds");
    expect(chapters[2].passages[0].plColumn).toBe("7.1");
    expect(chapters[0].passages[0].id).toBe("rule:prologus:1");
  });
});
