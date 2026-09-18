# Lectio

A reader for St. Bernard of Clairvaux, *De Gradibus Humilitatis et Superbiae Tractatus*, written in vanilla TypeScript (no framework). Latin is transcribed from the supplied Migne PL 182 page images; English sits beside it as a translation of that Latin, not of a later critical recension.

## Run

```bash
npm install
npm run dev
```

Open the printed local URL (Vite, usually `http://localhost:5173/`).

On a lectio page, click a **Latin word** for this treatise’s closed lexicon (a curated Bernard gloss if one exists, otherwise Whitaker). The reader does not call a dictionary service on every click.

| Route | Page |
| --- | --- |
| `/` | Home |
| `/contents` | Chapters |
| `/lectio/:chapterId/:passageIndex` | Facing Latin / English, with lectio divina prompts |

`npm run build` type-checks and builds a static bundle. `npm run preview` serves that bundle.

## Architecture

- `src/main.ts` boots the app and `src/router.ts` handles the routes above (history-based, no router library).
- Each page (`src/pages/HomePage.ts`, `ContentsPage.ts`, `LectioPage.ts`) is a plain function that builds its DOM with the tiny `src/dom.ts` helper.
- `src/components/LatinText.ts` and `DictPopup.ts` render the clickable words and the glossary popup.
- There is no framework: state in the lectio view is kept in module scope and the article region is re-rendered directly.

## Text

The treatise has one source of truth, in two language files:

- `src/content/latin.md` — the Latin
- `src/content/english.md` — the facing English

Edit those files to change the text. The reader loads them at runtime. `src/content/work.ts` holds only app metadata (source notes, facsimile leaf index, lectio prompts), not the treatise.

`###` headings are lectio passages and may combine Bernard’s numbers (`### 52–53`). Bernard’s own Migne paragraphs are marked in the source with `#### 52`; the reader shows them as **§52**. Do not use `__52__` for this: underscores would be treated as Latin text.

Spelling follows the Migne printing with *j* respelt *i* (`charitas`, `iam`, `iactantia`). Mabillon’s closing *Admonitio* on cols. 971–972 is editorial and is omitted from the lectio text. Columns **945–946** have no facsimile in `public/facsimiles/`; their Latin is supplied from the same Migne edition so the treatise reads continuously.

## Facsimiles

Page images are in `public/facsimiles/` (`pl-941-942.png`, …). The scans cover **941–944** and **947–972**. Columns **953–954** are `MLT_1-4`, page 3. There is no `pl-945-946.png`.

Each passage records a facsimile filename, but the reader does not yet show the image.

## Lexicon

Word glosses live in `src/content/lexicon/` and cover *De gradibus* only. `lexicon.json` is what the reader loads; `overrides.json` holds hand-authored Bernard cards. See `src/content/lexicon/README.md` to rebuild.
