# 🚫 Request Denied

**What states won't let you put on a license plate, and how they decide. California reads the worst meaning into a birthday ending in 13.**

→ **[Open it](https://tnriley.github.io/request-denied/)**

Personalized-plate decisions from California, New York, Texas and a dozen states' 2012 ban lists, set side by side. California asks applicants what a plate means, then reads it the worst way it can: of 23,430 flagged applications in 2015–16, 80% were denied, and a flagged plate ending in 13 (read as a gang number) was approved 7% of the time, down from 11% in 2012–13. New York issued 741 plates ending in 13 over four years. Thirty denials are quoted as the DMV recorded them — a union member's local numbers, a Tesla golfing pun, a mother of eight — and seven of those exact plates were issued in New York. The 2012 lists, pulled out of scanned public-records responses, turn out not to be independent judgements: 71% of Arkansas's banned list is on Vermont's, OLDFART is on all twelve large lists, and Maine's list is mostly Alaska's. Utah's list overlaps least with the others and is the only one that gives a reason for every plate. Texas doesn't consider intent at all but dates every request, so its 2025 rejections follow the news: all seven plates naming Elon Musk were requested between March 25 and June 17. Built around a trap: pdftotext's layout mode silently pairs about 84 of Texas's 1,951 plates with a neighbour's date.

## Running it

One self-contained HTML file. No build step, no server, no network access at runtime — open `index.html` in a browser, or serve the directory with any static host.

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Rebuilding it from scratch

[REBUILD.md](REBUILD.md) is written for an LLM with a shell and nothing else: the data sources and their quirks, the processing decisions, the page's structure and interactions, and a table of expected values to check the result against.

## Source

The full build pipeline is in [`src/`](src/), with a README describing how to regenerate the page from scratch.

## Data

- **[California DMV personalized plate review decisions, 2015–16 (released to Noah Veltman)](https://github.com/veltman/ca-license-plates)** — Government public records; the repository states no licence. The page carries derived counts and quoted rows, not the file.
- **[New York DMV personalized plate orders, rejections and Red Guide, 2010–14 (WNYC FOIL request)](https://github.com/datanews/license-plates)** — Government public records; the repository states no licence. The page carries derived counts only.
- **[State DMV banned-plate lists, 2012 (governmentattic.org) and California review sheets, 2012–13 (MuckRock), collected by Dan Nguyen](https://github.com/dannguyen/dmv-vanity-plate-rejections)** — Government public records; the repository states no licence. The page carries derived counts and quoted rows, not the files.
- **[Texas DMV declined personalized plates, 2025, and personalized plate criteria](https://www.txdmv.gov/sites/default/files/body-files/PLP_Criteria.pdf)** — Texas government public records. The declined-plate PDF is fetched from FOX 4's re-host; the page carries derived counts and dates.

Every figure on the page is computed from the data shipped with it. Check the page's own methods panel for how each number is derived and where it should not be pushed.

## Built with

python 3 (standard library), stdlib xlsx reader, pdftotext -raw / -layout, OCR table extraction, vanilla JS, inline SVG, node DOM-stub page test.

## Licence

Code is MIT (see [LICENSE](LICENSE)). Data keeps the licence of its source, listed above.

---

Part of [Quick Projects](https://github.com/TNRiley/quick-projects) — one self-contained thing, built in one session. First published 2026-09-16.
