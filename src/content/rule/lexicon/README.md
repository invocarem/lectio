# Build the Rule vocabulary

This folder is the closed word list for the *Regula Benedicti*. The reader looks words up here. It does not call Whitaker on every click, and it does not ship a general dictionary.

Tracked files are `lexicon.json` (parsed dictionary the reader loads) and `overrides.json` (hand-authored cards). `analyses.json` is Whitaker's raw dump; it is gitignored and rebuilt when you need it.

This copy comes from the humility reader's Rule lexicon.

```bash
python3 tools/extract_wordlist.py --work rule
python3 tools/parse_analyses.py --work rule
python3 tools/apply_overrides.py --work rule
```

`src/content/rule/latin.md` is the source. The app never edits it.
