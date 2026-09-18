# Build the treatise vocabulary

This folder is the closed word list for *De gradibus humilitatis et superbiae*. The reader looks words up here. It does not call Whitaker on every click, and it does not ship a general dictionary.

This copy was analysed in the humility reader against that project's working Latin. Lectio's Migne transcription differs in places (spellings, a few forms), so a click may miss. Curated Bernard cards in `overrides.json` still apply where the printed form matches.

Tracked files are `lexicon.json` (parsed dictionary the reader loads) and `overrides.json` (hand-authored cards). `analyses.json` is Whitaker's raw dump; it is gitignored and rebuilt when you need it.

## Rebuild

```bash
python3 tools/extract_wordlist.py --work gradibus   # latin.md → forms.json
python3 tools/parse_analyses.py --work gradibus     # analyses.json → lexicon.json
python3 tools/apply_overrides.py --work gradibus    # overrides.json → curated cards
```

`npm run lexicon:extract` / `lexicon:parse` / `lexicon:curate` are the same (they default to *De gradibus*).

To rebuild `analyses.json` you need Docker and Whitaker's Words (see the humility repo's `services/whitaker-server/` and `tools/analyze-in-docker.sh`). This project keeps the already-parsed `lexicon.json` so the reader works without that image.

Each form in `lexicon.json` has:

- `key` / `form` / `query` / `count` / `first`
- `pos` — Whitaker morphology tags
- `senses` — lemma + gloss from Whitaker
- `edited` — curated Bernard card when `overrides.json` has one
