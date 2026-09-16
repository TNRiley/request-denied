#!/usr/bin/env python3
"""Turn the raw downloads in .cache/ into four clean tables in .cache/:

  tx2025.csv      plate, request_date                     (Texas, every declined plate in 2025)
  ca2013.csv      plate, status, meaning, comments        (California review sheets, 2012-13, .xlsx only)
  ca2015.csv      plate, status, code, meaning, comments  (California review sheets, 2015-16)
  ny.csv          plate, outcome                          (New York, issued / rejected / red-guide)
  banned2012.csv  state, plate, reason, source_state      (26 states' 2012 banned lists, OCR)

Needs `pdftotext` (poppler or xpdf). Standard library otherwise.
"""
import csv, datetime, glob, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); C = os.path.join(HERE, ".cache")
sys.path.insert(0, HERE); from xlsx import rows as xlsx_rows

def write(name, header, recs):
    with open(os.path.join(C, name), "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh); w.writerow(header); w.writerows(recs)
    print("%-15s %6d rows" % (name, len(recs)))

def pdftext(pdf, mode):
    return subprocess.run(["pdftotext", mode, "-q", pdf, "-"], capture_output=True).stdout.decode("utf-8", "replace")

# ---- Texas ---------------------------------------------------------------
# TRAP: -layout drifts plates and dates apart by a row wherever a cell wraps (~84 of 1,951),
# silently. -raw and -table agree with each other and with the header count; use -raw and
# refuse to continue if they ever disagree.
pat = re.compile(r"^(.*\S)\s+(\d{1,2})/(\d{1,2})/(20\d\d)$")
def tx(mode):
    out = []
    for l in pdftext(os.path.join(C, "tx2025.pdf"), mode).splitlines():
        m = pat.match(re.sub(r"\s+", " ", l.strip()))
        if m: out.append((m.group(1), datetime.date(int(m.group(4)), int(m.group(2)), int(m.group(3))).isoformat()))
    return out
raw, table = tx("-raw"), tx("-table")
if raw != table or len(raw) != 1951:
    raise SystemExit("Texas parse disagrees (raw %d, table %d) - check the PDF" % (len(raw), len(table)))
write("tx2025.csv", ["plate", "request_date"], raw)

# ---- California 2012-13 (MuckRock) ---------------------------------------
# Header names and order vary sheet to sheet; map by header text. The 72 .xls files are skipped.
recs = []
for f in sorted(glob.glob(os.path.join(C, "collection/data/muckrock/fetched/CA/*.xlsx"))):
    hdr = None
    for r in xlsx_rows(f):
        u = [str(x).strip().upper() for x in r]
        if "PLATE" in u and any("STATUS" in x for x in u):
            hdr = {}
            for i, x in enumerate(u):
                if x == "PLATE": hdr["plate"] = i
                elif "STATUS" in x: hdr["status"] = i
                elif "MEANING" in x: hdr["meaning"] = i
                elif "COMMENT" in x: hdr["comments"] = i
            continue
        if hdr and len(u) > hdr["status"] and u[hdr["status"]] in ("Y", "N"):
            g = lambda k: u[hdr[k]] if k in hdr and hdr[k] < len(u) else ""
            recs.append((g("plate").replace(" ", ""), g("status"), g("meaning"), g("comments")))
write("ca2013.csv", ["plate", "status", "meaning", "comments"], recs)

# ---- California 2015-16 (Veltman) ----------------------------------------
recs = []
with open(os.path.join(C, "ca-2015-2016/applications.csv"), encoding="utf-8", errors="replace") as fh:
    for r in csv.DictReader(fh):
        s = (r["status"] or "").strip().upper()
        if s in ("Y", "N"):
            recs.append(((r["plate"] or "").strip().upper(), s, (r["review_reason_code"] or "").strip(),
                         (r["customer_meaning"] or "").strip().upper(), (r["reviewer_comments"] or "").strip().upper()))
write("ca2015.csv", ["plate", "status", "code", "meaning", "comments"], recs)

# ---- New York 2010-14 ----------------------------------------------------
recs = []
for name, outcome in (("accepted-plates.csv", "issued"), ("rejected-plates.csv", "rejected"), ("red-guide.csv", "red-guide")):
    with open(os.path.join(C, "ny-2010-2014", name), encoding="utf-8", errors="replace") as fh:
        recs += [((r["plate"] or "").strip().upper(), outcome) for r in csv.DictReader(fh) if (r["plate"] or "").strip()]
write("ny.csv", ["plate", "outcome"], recs)

# ---- 2012 state lists (governmentattic.org, OCR) --------------------------
PLATE = re.compile(r"^[A-Z0-9&*#@!$+\-]{2,8}$")
STOP = set("""PLATE PLATES CODE CODES REJECT REJECTED STATE PAGE DMV DEPARTMENT OF THE AND OR TO FOR IN ON BY
NOT ISSUE DO AVAILABLE REQ REQUEST DATE TIME OPTION RANGE FROM NO NBRS ADD DELETE INQ DISPLAY MOTOR VEHICLE
VEHICLES DIVISION REVENUE LICENSE SPECIAL PERSONALIZED STATUS COMMENTS REASON DENIED INTERNET MAIL DEPUTY
BLOCK SPAC INVAL INAPP LIST TOTAL YES NY AR AK ME FAX TEL PO BOX SUITE RE CC AS IS IT AN US WE SERIES
CONFLICT ALREADY ISSUED REFERENCE NOTE AGES""".split())
def clean(tok):
    t = re.sub(r"\s+", "", tok.strip().upper()).strip("[]()\"'.,:;|")
    ok = PLATE.match(t) and re.search("[A-Z0-9]", t) and t not in STOP and not re.fullmatch(r"\d{1,4}|\d{8}|RFD\d+", t)
    return t if ok else None
def lay(s):
    pdf = glob.glob(os.path.join(C, "collection/data/governmentattic.org/ocr-pdf/%s-*.pdf" % s))[0]
    return pdftext(pdf, "-layout").splitlines()
prose = lambda l: len(re.findall(r"[a-z]{3,}", l)) >= 2
out, seen = [], set()
def add(s, p, reason="", src=""):
    if p and (s, p) not in seen: seen.add((s, p)); out.append((s, p, reason, src))
for s in "AZ IA GA WI KS DC VT NJ AR OH NM".split():          # columns split on 2+ spaces
    for l in lay(s):
        if not prose(l):
            for cell in re.split(r"\s{2,}", l.strip()): add(s, clean(cell))
for l in lay("ME"):                                            # plate + the state it came from
    for p, st in re.findall(r"([A-Z0-9&*#@! ]{2,9}?)\s{1,}([A-Z]{2})(?=\s{2,}|$)", l): add("ME", clean(p), src=st)
for l in lay("NY"):                                            # plate + 7-digit id
    for p in re.findall(r"(\S+)\s+\d{6,8}", l): add("NY", clean(p))
for l in lay("UT"):                                            # plate + reason
    m = re.match(r"\s*(\S+)\s{2,}([A-Z][A-Z /]+?)\s*$", l)
    if m and m.group(2) not in ("SERIES CONFLICT", "ALREADY ISSUED", "INCOMPLETE APP"): add("UT", clean(m.group(1)), m.group(2).strip())
for l in lay("CO"):                                            # rejection letters, code 06 = offensive
    for p, c in re.findall(r"\[([^\]]{1,30})\]\s*\[(\d{2})\]", l):
        if c == "06": add("CO", clean(p), "possibly offensive")
for l in lay("OK"):                                            # interleaved with DO NOT ISSUE markers
    if "ISSUE" not in l and not prose(l):
        cells = re.split(r"\s{2,}", l.strip())
        if len(cells) == 1: add("OK", clean(cells[0]))
write("banned2012.csv", ["state", "plate", "reason", "source_state"], out)
