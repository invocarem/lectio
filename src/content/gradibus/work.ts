import latinMd from "./latin.md?raw";
import englishMd from "./english.md?raw";
import { assembleWork } from "../fromMarkdown";
import { lectioSteps } from "../lectioSteps";
import type { Work } from "../types";

export const gradibus: Work = assembleWork(latinMd, englishMd, {
  id: "gradibus",
  lede:
    "A quiet reader for Bernard of Clairvaux’s treatise on the twelve steps of humility and pride. The Latin is transcribed from the Migne pages you supplied; English sits beside it for meditation, not as a substitute recension. Click a Latin word for a gloss.",
  citePrefix: "PL",
  edition: "PL 182, coll. 941–972, with columns 945–946 supplied from the same Migne edition (Mabillon).",
  source: {
    latin:
      "Transcribed from the Migne Patrologia Latina scans in public/facsimiles, except PL 945–946, which have no leaf here and are supplied from the same Migne edition (Mabillon). Spelling is that printing with j respelt i (charitas, iam, iactantia).",
    english:
      "Facing English is a translation of this Migne Latin, not of a later critical recension.",
    columnsPresent: "941–972",
    missingColumns: "",
    missingFacsimileNote:
      "Columns 945–946 have no leaf in this collection; the Latin is supplied from Migne.",
    leaves: [
      { columns: "941–942", pdf: "MLT_1-4", page: 1, facsimile: "pl-941-942.png" },
      { columns: "943–944", pdf: "MLT_1-4", page: 2, facsimile: "pl-943-944.png" },
      { columns: "953–954", pdf: "MLT_1-4", page: 3, facsimile: "pl-953-954.png" },
      { columns: "947–948", pdf: "MLT_1-4", page: 4, facsimile: "pl-947-948.png" },
      { columns: "949–950", pdf: "MLT_5_8", page: 1, facsimile: "pl-949-950.png" },
      { columns: "951–952", pdf: "MLT_5_8", page: 2, facsimile: "pl-951-952.png" },
      { columns: "955–956", pdf: "MLT_5_8", page: 4, facsimile: "pl-955-956.png" },
      { columns: "957–958", pdf: "MLT_9-12", page: 1, facsimile: "pl-957-958.png" },
      { columns: "959–960", pdf: "MLT_9-12", page: 2, facsimile: "pl-959-960.png" },
      { columns: "961–962", pdf: "MLT_9-12", page: 3, facsimile: "pl-961-962.png" },
      { columns: "963–964", pdf: "MLT_9-12", page: 4, facsimile: "pl-963-964.png" },
      { columns: "965–966", pdf: "MLT_13-16", page: 1, facsimile: "pl-965-966.png" },
      { columns: "967–968", pdf: "MLT_13-16", page: 2, facsimile: "pl-967-968.png" },
      { columns: "969–970", pdf: "MLT_13-16", page: 3, facsimile: "pl-969-970.png" },
      { columns: "971–972", pdf: "MLT_13-16", page: 4, facsimile: "pl-971-972.png" },
    ],
    notes: [
      "Latin is taken from the supplied PDF page images (Migne PL 182), except columns 945–946.",
      "Columns 945–946 have no facsimile in this repo; the Latin is supplied from Migne (Mabillon) so Caput III reads continuously.",
      "Columns 953–954 are MLT_1-4, page 3 — not inferred from another leaf.",
      "Mabillon’s closing Admonitio on col. 971–972 is editorial and is omitted from the lectio text.",
    ],
  },
  lectio: {
    steps: lectioSteps.map((step) =>
      step.id === "contemplatio"
        ? { ...step, prompt: "Rest. Do not force words. Remain before the Truth Bernard is seeking." }
        : step,
    ),
  },
});
