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

## iOS (Mac)

The iPhone app is a Capacitor shell around that Vite bundle. Xcode does **not** watch `src/`. It loads a copied snapshot in `ios/App/App/public`. `npm run dev` only updates the browser.

### First run

You need a Mac with Xcode (from the App Store; open it once to finish setup). The app targets iOS 15+.

```bash
npm install
npm run ios
```

That builds the web app, copies it into the iOS project, and opens `ios/App/App.xcodeproj`.

1. In Xcode, select the **App** scheme and your iPhone (or a simulator) in the destination menu.
2. Under **Signing & Capabilities**, choose your Apple Developer team. The bundle ID is `com.invocarem.lectio`.
3. Press Run (⌘R). On a physical phone, if iOS asks you to trust the developer, open **Settings → General → VPN & Device Management** and trust the certificate.

### After changing web or UI code

```bash
npm run cap:sync
```

Then Run again in Xcode. That command is `npm run build` plus `npx cap sync ios`. Skipping it leaves Xcode on the old UI.

If the phone still shows the previous UI after a sync, delete Lectio from the device and Run again. WKWebView can keep the old bundle.

### TestFlight

You need a paid [Apple Developer Program](https://developer.apple.com/programs/) membership (this project’s team is already set: `RD9Q6XUA82`). Bundle ID is `com.invocarem.lectio`.

1. Sync the web UI into the iOS project:

   ```bash
   npm run cap:sync
   ```

2. In [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **+**, create **Lectio** with bundle ID `com.invocarem.lectio` (register that ID under [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) first if it is missing). Platform: iOS.

3. In Xcode, open `ios/App/App.xcodeproj`. Select the **App** target → **Signing & Capabilities** → your team, Automatic signing.

4. Destination menu: **Any iOS Device (arm64)** (not a simulator). **Product → Archive**.

5. In the Organizer, **Distribute App** → **App Store Connect** → **Upload**. Xcode will create an Apple Distribution certificate on first upload if needed.

6. Back in App Store Connect → the app → **TestFlight**. Wait until the build finishes processing (often 5–30 minutes).

7. Internal testers (people on your App Store Connect team) can install from the TestFlight app as soon as processing finishes. External testers need a group, a short “What to Test” note, and a first-time Beta App Review.

Each new TestFlight build needs a higher **Build** number (`CURRENT_PROJECT_VERSION` in the App target; it is `1` today). The marketing version (`1.0`) can stay the same.

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
