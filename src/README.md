# Pipeline

Run in order from this directory; see ../REBUILD.md for sources, traps and expected values.

```
bash 01_fetch.sh && python 02_parse.py && python 03_payload.py && python 04_inject.py && node test_page.js
```

Downloads land in `.cache/` (gitignored). `payload.json` is regenerated, not committed.
