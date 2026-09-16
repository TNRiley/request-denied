#!/usr/bin/env python3
"""Compute every figure the page shows and write payload.json.

Reads the tables 02_parse.py leaves in .cache/. The quoted examples in section 01 are
chosen by hand (CURATED below) but their text is always read from the data, never retyped:
a key that is not found stops the build.

Curation rules for CURATED: the applicant's explanation is plausibly innocent, the plate and
both texts contain no slur, and nothing in them names the applicant or a family member.
"""
import collections, csv, itertools, json, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); C = os.path.join(HERE, ".cache")
def load(name): 
    with open(os.path.join(C, name), encoding="utf-8") as fh: return list(csv.DictReader(fh))
ca13, ca15, ny, b12, tx = (load(n) for n in ("ca2013.csv", "ca2015.csv", "ny.csv", "banned2012.csv", "tx2025.csv"))
P = {}

# ---- headline numbers -----------------------------------------------------
issued = collections.Counter(r["plate"] for r in ny if r["outcome"] == "issued")
P["counts"] = dict(ca15=len(ca15), ca15_denied=sum(r["status"] == "N" for r in ca15),
                   ca13=len(ca13), ca13_denied=sum(r["status"] == "N" for r in ca13),
                   ny_issued=sum(issued.values()), ny_rejected=sum(r["outcome"] == "rejected" for r in ny),
                   states2012=len({r["state"] for r in b12}), pairs2012=len(b12), tx=len(tx))

# ---- 01 two readers: curated denials ---------------------------------------
CURATED = [
    ("ca15", "13LUV94"), ("ca15", "BLUE 14"), ("ca15", "13 BE8ST"), ("ca15", "18DUKE6"), ("ca15", "MWY88"),
    ("ca15", "CO2 KILR"), ("ca15", "H8WINTR"), ("ca15", "8MYBAIT"), ("ca15", "MDL 3SOM"),
    ("ca15", "1BATASS"), ("ca15", "TATA"), ("ca15", "LOVE SVD"), ("ca15", "PEWPEWS"), ("ca15", "CLD SQD"),
    ("ca15", "67NAM69"), ("ca15", "VOOPIN"), ("ca15", "POOPELL"), ("ca15", "1NUT"),
    ("ca15", "IHA8PPL"), ("ca15", "GUNDOGS"), ("ca15", "TRIGGA"), ("ca15", "PANDA13"), ("ca15", "USMC626"),
    ("ca15", "FTP"),
    ("ca13", "HOPATRL"), ("ca13", "KLR3CYL"), ("ca13", "4GOTR44"), ("ca13", "AFTRSX"),
    ("ca13", "XZMBKLR"), ("ca13", "BNDLVN"),
]
src = {"ca15": ca15, "ca13": ca13}
# Profanity inside a quoted reviewer comment is masked for display; nothing else is altered.
mask = lambda t: re.sub(r"\b(F)UCK|\b(S)HIT", lambda m: (m.group(1) or m.group(2)) + "***", t)
ex = []
for ds, plate in CURATED:
    hit = [r for r in src[ds] if r["plate"] == plate and r["status"] == "N"]
    if not hit: raise SystemExit("curated plate not found: %s %s" % (ds, plate))
    r = hit[0]
    clip = lambda s: mask(re.sub(r"\s+", " ", s.strip().strip('"')).rstrip(".")[:150])
    ex.append(dict(plate=plate, years="2015–16" if ds == "ca15" else "2012–13", meaning=clip(r["meaning"]),
                   reviewer=clip(r["comments"]), ny=issued.get(plate.replace(" ", ""), 0)))
P["examples"] = ex

# ---- 02 code numbers ------------------------------------------------------
def suffix(rows, s):
    f = [r for r in rows if r["plate"].replace(" ", "").endswith(s)]
    return dict(flagged=len(f), approved=sum(r["status"] == "Y" for r in f))
P["suffixes"] = [dict(s=s, why=why, ca13=suffix(ca13, s), ca15=suffix(ca15, s),
                      ny=sum(v for k, v in issued.items() if k.endswith(s)))
                 for s, why in (("13", "Sureño gang number"), ("14", "Norteño gang number / white-supremacist '14 words'"),
                                ("18", "read as a gang number"), ("88", "neo-Nazi code for 'HH'"), ("69", "sexual"))]
den15 = [r for r in ca15 if r["status"] == "N"]
VOC = [("gang", r"\bGANG"), ("sexual", r"SEXUAL|\bSEX\b"), ("drugs", r"DRUG|MARIJ|WEED|420"),
       ("hate or hostile", r"\bHATE|HOSTILE|HITLER|NAZI"), ("area code", r"AREA CODE"),
       ("guns or weapons", r"\bGUN|WEAPON|RIFLE"), ("police", r"POLICE|\bCOP\b|LAW ENF"),
       ("Urban Dictionary", r"URBAN")]
P["vocab"] = [dict(k=k, n=sum(bool(re.search(p, r["comments"])) for r in den15)) for k, p in VOC]
P["vocab_base"] = len(den15)

# ---- 03 borrowed lists ----------------------------------------------------
lists = collections.defaultdict(set)
for r in b12: lists[r["state"]].add(r["plate"])
big = sorted(s for s, v in lists.items() if len(v) >= 900)
P["states"] = [dict(s=s, n=len(lists[s])) for s in big]
P["overlap"] = [[round(len(lists[a] & lists[b]) / len(lists[a]), 3) if a != b else None for b in big] for a in big]
P["maine_sources"] = collections.Counter(r["source_state"] for r in b12 if r["state"] == "ME" and len(r["source_state"]) == 2).most_common(4)
share = collections.Counter()
for s in big:
    for p in lists[s]: share[p] += 1
P["most_shared"] = [(p, n) for p, n in share.most_common(400)
                    if re.fullmatch(r"(OLDFART|AZKIKR|SUX2BU|EATME|HORNY|PIMPIN|BADASS|SUCKIT|4Q|NOSHT|PHUQ)", p)]
P["utah"] = collections.Counter(r["reason"] for r in b12 if r["state"] == "UT").most_common(10)

# ---- 04 the calendar ------------------------------------------------------
P["tx_months"] = [sum(r["request_date"][5:7] == "%02d" % m for r in tx) for m in range(1, 13)]
TAGS = [("Musk", r"MUSK|(?<!F)ELON"), ("ICE", r"ICE(?!R)"), ("FAFO", r"FAFO|FAF0")]
tl = []
for tag, pat in TAGS:
    for r in tx:
        p = r["plate"]
        if re.search(pat, p.replace(" ", "")) and not re.search(r"NICE|RICE|JUICE|DICE|VICE|SLICE|PRICE|ICEMAN", p.replace(" ", "")):
            tl.append(dict(tag=tag, plate=p, date=r["request_date"]))
P["tx_tagged"] = sorted(tl, key=lambda d: d["date"])

out = os.path.join(HERE, "payload.json")
with open(out, "w", encoding="utf-8", newline="\n") as fh: json.dump(P, fh, ensure_ascii=False, separators=(",", ":"))
print("payload.json %.1f KB" % (os.path.getsize(out) / 1e3))
print(json.dumps({k: v for k, v in P.items() if k not in ("overlap", "examples")}, ensure_ascii=False, indent=0)[:2600])
for e in P["examples"]: print(e)
