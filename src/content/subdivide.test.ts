import { describe, expect, it } from "vitest";
import {
  groupSentences,
  resolveSubdivision,
  splitSentences,
  subdivide,
  subdivideAligned,
  wordCount,
} from "./subdivide";

describe("splitSentences", () => {
  it("splits on terminal periods", () => {
    expect(splitSentences("Prima sententia. Secunda sententia. Tertia.")).toEqual([
      "Prima sententia.",
      "Secunda sententia.",
      "Tertia.",
    ]);
  });

  it("splits on question and exclamation marks", () => {
    expect(splitSentences("Quid est hoc? Certe! Denique.")).toEqual([
      "Quid est hoc?",
      "Certe!",
      "Denique.",
    ]);
  });

  it("keeps scripture-book abbreviations intact", () => {
    expect(
      splitSentences(
        "Ego sum via, veritas, et vita (Ioan. xiv, 6). Discite a me (Matth. xi, 29).",
      ),
    ).toEqual([
      "Ego sum via, veritas, et vita (Ioan. xiv, 6).",
      "Discite a me (Matth. xi, 29).",
    ]);
  });

  it("keeps cap. and Reg. intact", () => {
    const text = "beatus Benedictus non numerandos, sed ascendendos proponit (Reg. cap. 7), prius ostendo.";
    expect(splitSentences(text)).toEqual([text]);
  });

  it("treats a lone letter + period as an abbreviation (S. Bernardus)", () => {
    const text = "S. Bernardus Claraevallensis Abbas scripsit hoc tractatum.";
    expect(splitSentences(text)).toEqual([text]);
  });

  it("keeps running page/verse abbreviations intact", () => {
    const text = "Vide cap. 7, p. 3, v. 12; ibi alia invenies.";
    expect(splitSentences(text)).toEqual([text]);
  });

  it("consumes closing punctuation after a boundary (8.)", () => {
    expect(splitSentences("legem dedit delinquentibus in via? (Psal. xxiv, 8.) In via quippe.")).toEqual([
      "legem dedit delinquentibus in via? (Psal. xxiv, 8.)",
      "In via quippe.",
    ]);
  });

  it("splits on the verb est. even though Est. is a book abbreviation", () => {
    expect(
      splitSentences("Altera labor, altera fructus laboris est. Unde sciam, inquis, quod ibi de humilitate locutus sit?"),
    ).toEqual([
      "Altera labor, altera fructus laboris est.",
      "Unde sciam, inquis, quod ibi de humilitate locutus sit?",
    ]);
  });

  it("keeps Est. and Iob. citations intact", () => {
    expect(splitSentences("Scriptum est (Est. xiv, 6). Item (Iob. xxxii, 19). Sequitur.")).toEqual([
      "Scriptum est (Est. xiv, 6).",
      "Item (Iob. xxxii, 19).",
      "Sequitur.",
    ]);
  });
});

describe("groupSentences", () => {
  it("merges short sentences toward the target words", () => {
    const sentences = [
      "Uno verbo.",
      "Altero verbo.",
      "Tertio verbo.",
      "Quarta sententia de superbiae gradibus loquitur, quos omnes christiani vitare debent, si ad veritatis lumen pervenire et in humilitate manere desiderant.",
    ];
    const groups = groupSentences(sentences, 25);
    // The three short ones (6 words) fit; the long one (21 words) would push
    // the block to 27 > 25, so it stands alone.
    expect(groups).toHaveLength(2);
    expect(groups[0]).toContain("Uno verbo.");
    expect(groups[0]).toContain("Tertio verbo.");
    expect(groups[1]).toContain("Quarta sententia");
  });

  it("keeps a single long sentence whole", () => {
    const long = "Hoc verbum nimis longum est valde".repeat(8).trim() + ".";
    const sentences = [long];
    expect(groupSentences(sentences, 25)).toEqual([long]);
  });
});

describe("subdivide", () => {
  it("recommended path: splits a long paragraph into ~25-word blocks", () => {
    const paragraph =
      "Prima sententia de humilitate loquitur ad fratres, ut audiant et intelligant, et fructum percipiant. " +
      "Secunda sententia de superbiae gradibus disserit, quos vitare debemus, si ad veritatem pervenire cupimus, et ad Deum accedere. " +
      "Tertia sententia hortatur omnes ad patientiam et perseverantiam in via recta, donec ad finem perveniamus.";
    const blocks = subdivide(paragraph, { targetWords: 25 });
    expect(blocks.length).toBeGreaterThan(1);
    // every word is preserved exactly once across the blocks
    expect(
      blocks.map((b) => wordCount(b)).reduce((a, b) => a + b, 0),
    ).toEqual(wordCount(paragraph));
  });

  it("returns a single block for short text (no over-fragmenting)", () => {
    expect(subdivide("Breviter dicendum est.")).toEqual(["Breviter dicendum est."]);
  });

  it("honours an editorial groups override", () => {
    const sentences = ["Una.", "Duo.", "Tria.", "Quattuor."];
    const blocks = subdivide(sentences.join(" "), { groups: [3, 1] });
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain("Una.");
    expect(blocks[0]).toContain("Tria.");
    expect(blocks[1]).toContain("Quattuor.");
  });

  it("falls back to automatic grouping when an override is malformed", () => {
    // groups [2] does not account for all 3 sentences → ignored, auto used.
    expect(subdivide("Una. Duo. Tria.", { groups: [2] })).toEqual(
      subdivide("Una. Duo. Tria."),
    );
  });
});

describe("subdivideAligned", () => {
  it("produces exactly the requested row count", () => {
    const english =
      "The first sentence of the meditation is fairly long and continues on a little. " +
      "The second sentence is shorter. The third sentence follows and then ends here.";
    expect(subdivideAligned(english, 4)).toHaveLength(4);
  });

  it("keeps sentences whole (never cuts mid-sentence)", () => {
    const english = "One short sentence. Another short one. A third one.";
    const rows = subdivideAligned(english, 2);
    const joined = rows.filter(Boolean).join(" ");
    expect(wordCount(joined)).toBe(wordCount(english));
  });

  it("distributes English proportionally to more Latin rows", () => {
    // 3 English sentences across 3 rows → one row per sentence.
    const english = "Prima oratio. Secunda oratio. Tertia oratio.";
    expect(subdivideAligned(english, 3)).toEqual([
      "Prima oratio.",
      "Secunda oratio.",
      "Tertia oratio.",
    ]);
  });

  it("leaves empty rows when English has too few sentences", () => {
    const english = "Sola sententia.";
    const rows = subdivideAligned(english, 4);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toContain("Sola");
    expect(rows.filter((r) => r).length).toBe(1);
  });

  it("falls back to a single row even when English exceeds the word target", () => {
    const english =
      "The first sentence of the meditation is fairly long and continues on a little. " +
      "The second sentence is shorter. The third sentence follows and then ends here.";
    expect(subdivideAligned(english, 1)).toEqual([
      "The first sentence of the meditation is fairly long and continues on a little. The second sentence is shorter. The third sentence follows and then ends here.",
    ]);
  });
});

describe("resolveSubdivision", () => {
  it("uses explicit {la, en} pairs verbatim and aligned", () => {
    const la =
      "Locuturus ergo de gradibus humilitatis, quos beatus Benedictus non numerandos, sed ascendendos proponit (Reg. cap. 7), prius ostendo, si possum, quo per illos perveniendum sit, ut audito fructu perventionis, minus gravet labor ascensionis.";
    const en =
      "I am about to speak of the steps of humility, which blessed Benedict sets before us not to be counted but to be climbed (Rule, ch. 7). First I show, if I can, where those steps lead, so that once the fruit of arrival is heard, the labor of ascent may weigh less.";
    const { subs, enRows } = resolveSubdivision(la, en, { la: [la], en: [en] });
    expect(subs).toEqual([la]);
    expect(enRows).toEqual([en]);
  });

  it("pads {la, en} when English has fewer chunks than Latin", () => {
    const { subs, enRows } = resolveSubdivision(
      "Latina una. Latina duo. Latina tertia.",
      "English one. English two.",
      { la: ["Latina una.", "Latina duo.", "Latina tertia."], en: ["English one.", "English two."] },
    );
    expect(subs).toHaveLength(3);
    expect(enRows).toHaveLength(3);
    expect(enRows[0]).toContain("English one");
    expect(enRows[1]).toContain("English two");
    expect(enRows[2]).toBe("");
  });

  it("uses Latin sentence-count groups when override is a number[] (English proportional)", () => {
    const { subs, enRows } = resolveSubdivision(
      "Prima sententia. Secunda sententia. Tertia sententia.",
      "First. Second. Third.",
      [1, 2],
    );
    expect(subs).toHaveLength(2);
    expect(subs[0]).toContain("Prima");
    expect(enRows).toHaveLength(2);
  });

  it("falls back to automatic grouping with no override", () => {
    const { subs, enRows } = resolveSubdivision("Una. Duo. Tria.", "One. Two. Three.");
    expect(subs.length).toBeGreaterThan(0);
    expect(enRows.length).toBe(subs.length);
  });
});

describe("real De gradibus prose", () => {
  it("splits the long Praefatio sentence group without damaging abbreviations", () => {
    const text =
      "Rogasti me, frater Godefride, ut ea quae de gradibus humilitatis coram fratribus locutus fueram, pleniori tibi tractatu dissererem. " +
      "Cui tuae petitioni digne, ut dignum erat, et volens satisfacere, et timens non posse, evangelici consilii memor, non prius, fateor, incipere ausus sum, quam sedens computavi, si sufficerent sumptus ad perficiendum (Luc. xiv, 28).";
    const sentences = splitSentences(text);
    expect(sentences).toHaveLength(2);
    expect(sentences[0]).toMatch(/Godefride,/);
    expect(sentences[1]).toContain("(Luc. xiv, 28)");
  });
});
