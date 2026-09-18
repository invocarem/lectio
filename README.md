# Lectio

A quiet Latin reader. Latin is the index; English sits beside it for meditation. Click a Latin word for a gloss.

Works in the library today:

1. Bernard of Clairvaux, *De gradibus humilitatis et superbiae*
2. The Rule of St Benedict (*Regula Sancti Benedicti*)

## Run

```bash
npm install
npm run dev
```

Open the printed local URL (Vite, usually `http://localhost:5173/`).

| Route | Page |
| --- | --- |
| `/` | Library |
| `/:workId` | Work home |
| `/:workId/contents` | Chapters |
| `/:workId/lectio/:chapterId/:passageIndex` | Facing Latin / English, with lectio divina prompts |

`/contents` and `/lectio/...` still open *De gradibus*, so older bookmarks keep working.

`npm run build` type-checks and builds a static bundle. `npm run preview` serves that bundle.

## Architecture

- `src/main.ts` boots the app and `src/router.ts` handles the routes above (history-based, no router library).
- Each page (`src/pages/HomePage.ts`, `ContentsPage.ts`, `LectioPage.ts`) is a plain function that builds its DOM with the tiny `src/dom.ts` helper.
- `src/content/works.ts` is the library registry (`works`, `getWork`). Add a work by creating `src/content/<work>/work.ts` and appending it there.
- `src/content/types.ts` holds the `Work` object (parts → chapters → passages).
- `src/components/LatinText.ts` and `DictPopup.ts` render the clickable words and the glossary popup.
- There is no framework: state in the lectio view is kept in module scope and the article region is re-rendered directly.

## Text

Each work has its own folder. The app never writes those files.

| Path | Role |
| --- | --- |
| `src/content/works.ts` | Library registry |
| `src/content/gradibus/` | *De gradibus* (`latin.md`, `english.md`, facsimile metadata, lexicon) |
| `src/content/rule/` | Rule of St Benedict (`latin.md`, Verheyen rendering, lexicon) |
| `src/content/<work>/lexicon/` | Closed word list for that work |

*De gradibus* uses paired markdown (`latin.md` / `english.md`). `###` headings are lectio passages and may combine Bernard’s numbers (`### 52–53`). Bernard’s own Migne paragraphs are marked with `#### 52`; the reader shows them as **§52**. Spelling follows the Migne printing with *j* respelt *i* (`charitas`, `iam`, `iactantia`). Mabillon’s closing *Admonitio* on cols. 971–972 is editorial and is omitted. Columns **945–946** have no facsimile in `public/facsimiles/`; their Latin is supplied from the same Migne edition.

The Rule uses `latin.md` (traditional monastic text) plus `renderings/verheyen.json`. Chapter ids are namespaced (`rule:prologus`, `rule:7`).

## Facsimiles

Page images for *De gradibus* are in `public/facsimiles/` (`pl-941-942.png`, …). The scans cover **941–944** and **947–972**. Columns **953–954** are `MLT_1-4`, page 3. There is no `pl-945-946.png`. The Rule has no facsimiles in this collection.

## Lexicon

Word glosses are per work under `src/content/<work>/lexicon/`. The reader loads only the active work’s `lexicon.json`. `overrides.json` holds hand-authored cards. See that folder’s README to rebuild.

```bash
python3 tools/extract_wordlist.py --work gradibus
python3 tools/parse_analyses.py --work gradibus
python3 tools/apply_overrides.py --work rule
```

`npm run lexicon:extract` / `lexicon:parse` / `lexicon:curate` default to *De gradibus*.
