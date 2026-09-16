# Rebuilding Request Denied

A recipe, not a summary. Assumes a shell, Python 3 (standard library only), Node, `git`, `curl`
and `pdftotext` (poppler or xpdf), and no other context.

## 1. What is being built

One self-contained HTML page comparing how US states decide which personalized license plates
to refuse. The effects it exists to show:

1. **California reads the worst possible meaning into a plate.** Its review committee sees the
   applicant's stated meaning and overrides it. Numbers are read as gang or hate codes: a flagged
   plate ending in 13 was approved 7% of the time in 2015–16 (11% in 2012–13), while New York
   issued 741 plates ending in 13 in 2010–14.
2. **States' 2012 ban lists were copied from one another.** 71% of Arkansas's list is on Vermont's.
   OLDFART is on all twelve large lists. Maine's list tags most entries "AK". Utah overlaps least.
3. **Texas ignores intent but dates every request, so its rejections track the news.** All seven
   2025 plates naming Elon Musk were requested between 2025-03-25 and 2025-06-17.

## 2. Data sources

Run `src/01_fetch.sh`. It writes everything into `src/.cache/` (gitignored).

| Source | URL | Contents |
|---|---|---|
| California 2015–16 | `github.com/veltman/ca-license-plates` → `applications.csv` | 23,463 flagged applications: `plate, review_reason_code, customer_meaning, reviewer_comments, status` |
| New York 2010–14 | `github.com/datanews/license-plates` | `accepted-plates.csv`, `rejected-plates.csv`, `red-guide.csv` (the automatic ban list) |
| California 2012–13 + 2012 state lists | `github.com/dannguyen/dmv-vanity-plate-rejections` | `data/muckrock/fetched/CA/`, ~300 review workbooks; `data/governmentattic.org/ocr-pdf/`, 27 OCR'd responses (26 states + DC) |
| Texas 2025 | `static.fox4news.com/www.fox4news.com/content/uploads/2026/01/denied_plate_selections_cy2025.pdf` | 38 pages, "Plate Selection" and "Request Date"; the header says 1,951 plates |
| Texas criteria | `txdmv.gov/sites/default/files/body-files/PLP_Criteria.pdf` | the "does not consider your meaning or intent" quote |

Quirks that bite:

- **Texas PDF: never use `pdftotext -layout`.** Wherever a plate cell wraps, plates and dates slip
  a row apart, and about 84 plates get a neighbour's date with no error: a plate with no date on
  its line, and a date with no plate a few lines later. `-raw` and `-table` agree with each other,
  and both yield exactly 1,951 rows. `02_parse.py` parses both and stops if they differ. Plates contain
  spaces and symbols (`@STL BLZ`, `&FKICE`), so split the date off the end of the line.
- **TxDMV's own copy was not found.** Guessing the filename under `txdmv.gov/.../body-files/` gets no
  response for 2023–25 and a 404 for 2021–22. The Houston Chronicle and Austin American-Statesman
  reported the 2023 list (3,095 plates, Jan–Nov) and the 2024 list (2,341), but the files were not
  located.
- **California 2012–13 workbooks are inconsistent.** Header names and order change between sheets
  (MEANING and COMMENTS swap; some have no reason code), and a reviewer-name line, order number and
  Excel serial date sit above the header. Map columns by header text. `openpyxl` is not assumed:
  `src/xlsx.py` reads `.xlsx` as zip + XML. The 72 legacy `.xls` files are skipped.
- **California 2015–16 plate symbols:** `$` is a heart, `#` a hand, `&` a star, `+` a plus. Statuses
  other than Y/N (blank, `M`, `REMOVE`) are dropped.
- **2012 scans come in six layouts:**
  - Columns: split on 2+ spaces, and remove single spaces inside a cell (OCR writes `K N U C K IE`).
  - New York: plate + 7-digit id.
  - Utah: plate + reason. Drop `SERIES CONFLICT`, `ALREADY ISSUED` and `INCOMPLETE APP`.
  - Colorado: rejection letters `[PLATE] [code]`. Keep code 06 "possibly offensive". The bracket can
    hold up to ~30 characters of padding.
  - Oklahoma: plates interleaved with `DO NOT ISSUE` markers.
  - Maine: plate + two-letter state.

  Eleven responses (CA, MI, MO, MT, ND, NE, RI, SD, TN, WA, WY) are only letters.
- **Numbered blocks** (Georgia GODS1–GODS32, New Jersey FUBAR2–FUBAR96) are ranges, not separate
  judgements. They inflate any per-theme share, so the page doesn't rank themes by state.
- **Windows:** Python's default encoding is cp1252, so every script passes `encoding="utf-8"`. Do not
  write Python that contains regex `\b` through an unquoted heredoc or a non-raw string: the mask
  regex once reached disk as backspace bytes and silently matched nothing.

## 3. Processing

```
bash   src/01_fetch.sh      # downloads into src/.cache/
python src/02_parse.py      # -> .cache/{tx2025,ca2013,ca2015,ny,banned2012}.csv
python src/03_payload.py    # -> src/payload.json (every figure the page shows)
python src/04_inject.py     # -> index.html, then wrap_for_pages + add_catalog_link
node   src/test_page.js     # runs the page script in a DOM stub; asserts the checkpoints
```

Decisions and why:

- **Compare what states refuse, never how often.** California's file holds only flagged applications,
  New York's every issued plate. California rates are among flagged plates; New York figures are counts.
- **Endings** are the last two characters after removing spaces.
- **Overlap** is directional: the share of the row state's distinct plates that appear on the column
  state's list. Only lists of 900 or more plates (12 states) are compared, because short lists give
  noisy shares.
- **Examples** (`CURATED` in `03_payload.py`) are hand-picked by `(dataset, plate)`. Their text is read
  from the data, never retyped, and the build stops if a key is missing. Rules: the explanation is
  plausibly innocent; no slur appears in the plate or either text; nothing names or locates the applicant.
  Dropped under those rules:
  - VIVA42O: the reviewer quotes a birthdate.
  - CTCH2NA: location plus business.
  - 9BALL 49: hobby plus birth year.
  - TRD4X4: slur in the comment.

  "FUCK" and "SHIT" in comments are masked as `F***`/`S***`; that is the only alteration.
- **Texas tags** are regexes on the plate with spaces removed:
  - Musk: `MUSK|(?<!F)ELON` (the lookbehind stops FELON matching).
  - ICE: `ICE(?!R)`, minus NICE/RICE/JUICE/DICE/VICE/SLICE/PRICE/ICEMAN.
  - FAFO: `FAFO|FAF0`.

  Read the tagged list by eye after any change.

## 4. The page

**House style (Quick Projects):**
- Warm paper palette.
- Fraunces display with an italic accent ("Request *Denied*" in stamp red), Archivo body.
- IBM Plex Mono for figures and letterspaced section numbers.
- Light and dark tokens with a toggle.

**Series colours:** fixed order, validated for lightness, chroma, CVD separation and contrast.
- Light: `#27518F, #B7791F, #A33326` on `#F7F5F0`.
- Dark: `#4C8DF6, #B38224, #E0587A` on `#191A1E`.

**Sections:**
1. **Two readers.** A deck of 30 slips. Each has a CSS license plate, the applicant's meaning, the
   reviewer's comment in stamp red, a rotated "DENIED" stamp, and a badge if New York issued the same
   plate. Filter pills: All / Numbers / Weapons & violence / Sex & bodies.
2. **Code numbers.** A dumbbell dot plot of California approval rates for endings 13, 14, 18, 88 and 69
   (2012–13 as a ring, 2015–16 filled) on a 0–30% axis, a bar chart of terms in 2015–16 denial
   comments, and a table view.
3. **Borrowed lists.** A 12×12 overlap heatmap (single-hue opacity ramp, values printed at 30% and
   above) with a table view, Utah's reasons as bars, chips for the most widely shared strings, and a
   line on Maine's source states.
4. **The calendar.** Texas declined plates per month (grey bars) above three swim lanes of dated dots
   (Musk, ICE, FAFO).

Every mark carries a `data-tip` tooltip, shown on hover and on keyboard focus.

## 5. Verification

| Checkpoint | Expected |
|---|---|
| `tx2025.csv` rows | 1,951 (`-raw` == `-table`) |
| California 2015–16 Y/N decisions / denials | 23,430 / 18,757 |
| California 2012–13 decisions from `.xlsx` / approved | 3,999 / 674 |
| New York issued plates (rows) | 131,989 |
| Ending 13, CA 2015–16 flagged / approved | 802 / 57 (7.1%) |
| Ending 13, CA 2012–13 flagged / approved | 148 / 17 (11.5%) |
| Ending 88, CA 2015–16 flagged / approved; NY issued | 738 / 39; 760 |
| NY issued ending 13 | 741 |
| States with 2012 lists of 900+ plates | 12: AR AZ DC GA IA KS ME NJ OK UT VT WI |
| Arkansas's list on Vermont's | 70.8% |
| OLDFART lists | 12 of 12 |
| Maine source tags | AK 4,193 · ME 969 · NY 842 · AR 131 |
| Utah top reasons | SEX REFERENCE 350 · DRUG REFERENCE 233 · PROFANE 102 |
| Texas 2025 by month | 182 137 155 172 171 185 150 155 172 193 130 149 |
| Musk-tagged plates | 7, first WTH*ELON 2025-03-25, last ELONLFG 2025-06-17 |
| ICE-tagged plates | 3: &FKICE 10-13, ICEGANG 11-04, ICE@DICK 11-10 |
| Curated examples; issued in NY | 30; 7 |

`node src/test_page.js` asserts the headline figures against the built page.

## 6. What the page must say about itself

- California figures are among **flagged** applications only, so states cannot be ranked against each other.
- The 2012 lists are OCR with visible noise. Overlap is a pattern across lists, not a plate-level fact.
- The examples are chosen, and "plausibly innocent" is not proof. Reviewers catch real slurs too.
- The Texas tags rest on small numbers (7 and 3) from one year.
- Vocabulary counts are keyword matches, so they include negations such as "no gang reference".
