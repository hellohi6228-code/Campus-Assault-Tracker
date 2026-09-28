"""Build data/clery.js from the US Dept. of Education Campus Safety and Security (Clery Act) data.

Downloads the official "all institutions" Excel releases from ope.ed.gov and the IPEDS directory
file (for campus coordinates), then writes per-campus and national/state totals of reported sex
offenses. Run: python scripts/build_clery.py  (needs network access to ope.ed.gov and nces.ed.gov)

Counting method: Clery geography "total" = on-campus + noncampus + public property (residence-hall
counts are a subset of on-campus and are not added). Sex offenses = rape + fondling + incest +
statutory rape, as defined in the Clery Act.
"""
import datetime
import io
import json
import re
import sys
import urllib.request
import zipfile
from collections import defaultdict

import pandas as pd

API = "https://ope.ed.gov/campussafety/api/dataFiles/file?fileName="
# Each release covers three calendar years. "Rape"/"fondling" categories exist from 2014 on (earlier years
# used "forcible sex offenses" and are not comparable), so 2014-2024 is the full comparable history.
RELEASES = ["Crime2016EXCEL.zip", "Crime2019EXCEL.zip", "Crime2022EXCEL.zip", "Crime2025EXCEL.zip"]
# Newer releases (one per year, each covering the three prior calendar years) are picked up automatically.
NEWER = ["Crime%dEXCEL.zip" % y for y in range(2026, datetime.date.today().year + 2)]
GEOS = ["oncampuscrime", "noncampuscrime", "publicpropertycrime"]
OFFENSES = ["RAPE", "FONDL", "INCES", "STATR"]
IPEDS_DIRS = ["HD2024", "HD2023", "HD2022"]
UA = {"User-Agent": "Mozilla/5.0 (campus-assault-tracker data build)"}


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


def read_table(zf, stem):
    for name in zf.namelist():
        base = name.rsplit("/", 1)[-1].lower()
        if base.startswith(stem) and base.endswith((".xls", ".xlsx")):
            return pd.read_excel(io.BytesIO(zf.read(name)))
    raise FileNotFoundError(stem)


def load_coords():
    for d in IPEDS_DIRS:
        try:
            zf = zipfile.ZipFile(io.BytesIO(fetch(f"https://nces.ed.gov/ipeds/datacenter/data/{d}.zip")))
        except Exception as e:  # noqa: BLE001 - try the next year
            print(f"IPEDS {d}: {e}", file=sys.stderr)
            continue
        csv = next(n for n in zf.namelist() if n.lower().endswith(".csv"))
        hd = pd.read_csv(io.BytesIO(zf.read(csv)), encoding="latin1", low_memory=False)
        # Strip byte-order marks / stray characters from header names (e.g. "\xef\xbb\xbfUNITID").
        hd.columns = [re.sub(r"[^A-Z0-9_]", "", str(c).upper()) for c in hd.columns]
        hd = hd[["UNITID", "LATITUDE", "LONGITUD"]]
        print(f"IPEDS {d}: {len(hd)} institutions", file=sys.stderr)
        return {int(r.UNITID): (round(float(r.LATITUDE), 4), round(float(r.LONGITUD), 4))
                for r in hd.itertuples() if pd.notna(r.LATITUDE) and pd.notna(r.LONGITUD)}
    raise RuntimeError("could not load IPEDS directory file")


def main():
    campuses = {}  # UNITID_P -> info
    counts = defaultdict(lambda: defaultdict(lambda: [0, 0, 0, 0]))  # UNITID_P -> year -> offenses
    years = set()
    col_re = re.compile(r"^(%s)(\d\d)$" % "|".join(OFFENSES))

    releases = []
    for rel in RELEASES + NEWER:
        print("downloading", rel, file=sys.stderr)
        try:
            releases.append((rel, zipfile.ZipFile(io.BytesIO(fetch(API + rel)))))
        except Exception as e:  # noqa: BLE001 - a future release that isn't published yet
            if rel in RELEASES:
                raise
            print(rel, "not published yet:", e, file=sys.stderr)
    used = []
    for rel, zf in reversed(releases):   # newest first: a year's figures come from the latest release covering it
        rel_counts = defaultdict(lambda: defaultdict(lambda: [0, 0, 0, 0]))
        rel_years = set()
        for geo in GEOS:
            df = read_table(zf, geo)
            df.columns = [str(c).strip() for c in df.columns]
            for r in df.to_dict("records"):
                uid = int(r["UNITID_P"])
                if uid not in campuses:   # newest release's name, city and enrollment
                    campuses[uid] = {
                        # Releases spell some names two ways ("Texas A & M" / "Texas A&M"); keep one so records merge.
                        "name": re.sub(r"\b(\w) & (\w)\b", r"\1&\2", str(r["INSTNM"]).strip()),
                        "branch": str(r.get("BRANCH") or "").strip(),
                        "city": str(r.get("City") or "").strip().title(),
                        "state": str(r.get("State") or "").strip(),
                        "enroll": int(r["Total"]) if pd.notna(r.get("Total")) else 0,
                    }
                for col, val in r.items():
                    m = col_re.match(col)
                    if not m or pd.isna(val):
                        continue
                    yr = 2000 + int(m.group(2))
                    rel_years.add(yr)
                    rel_counts[uid][yr][OFFENSES.index(m.group(1))] += int(val)
        new_years = rel_years - years
        for uid, per in rel_counts.items():
            for yr, v in per.items():
                if yr in new_years:
                    counts[uid][yr] = v
        years |= new_years
        if new_years:
            used.append(rel)
        print(rel, "years", sorted(rel_years), "used for", sorted(new_years), file=sys.stderr)

    years = sorted(years)
    coords = load_coords()

    national = {y: [0, 0, 0, 0] for y in years}
    by_state = defaultdict(lambda: {y: 0 for y in years})
    recent = years  # every year is stored per campus (the site shows all-time totals)
    # Campus IDs and branch names change between releases, so combine records with the same institution
    # name and city; use any coordinates known for that institution when a record's own ID has none.
    by_name_coords = {}
    for uid, info in campuses.items():
        ll = coords.get(uid // 1000)
        if ll:
            by_name_coords.setdefault(info["name"], ll)
    merged, merged_info = {}, {}
    for uid, info in sorted(campuses.items()):
        key = (info["name"], info["city"].lower())
        tgt = merged.setdefault(key, defaultdict(lambda: [0, 0, 0, 0]))
        for y, v in counts.get(uid, {}).items():
            for i in range(4):
                tgt[y][i] += v[i]
        prev = merged_info.get(key)
        # Keep the branch label of the record with the most reports.
        if not prev or sum(sum(v) for v in counts.get(uid, {}).values()) > prev[1]:
            merged_info[key] = (dict(info, uid=uid), sum(sum(v) for v in counts.get(uid, {}).values()))

    out_campuses = []
    missing = 0
    for key, per_year in merged.items():
        info = merged_info[key][0]
        uid = info["uid"]
        for y in years:
            v = per_year.get(y, [0, 0, 0, 0])
            for i in range(4):
                national[y][i] += v[i]
            by_state[info["state"]][y] += sum(v)
        recent_vals = [per_year.get(y, [0, 0, 0, 0]) for y in recent]
        if not any(sum(v) for v in recent_vals):
            continue
        ll = coords.get(uid // 1000) or by_name_coords.get(info["name"])
        if not ll:
            missing += 1
            continue
        out_campuses.append([
            info["name"], info["branch"], info["city"], info["state"], ll[0], ll[1], info["enroll"],
            [v[:2] + [v[2] + v[3]] for v in recent_vals],  # [rape, fondling, incest+statutory] per recent year
        ])

    out_campuses.sort(key=lambda c: -sum(sum(v) for v in c[7]))
    data = {
        "source": "U.S. Department of Education, Campus Safety and Security Survey (Clery Act), releases " + ", ".join(sorted(used)),
        "sourceUrl": "https://ope.ed.gov/campussafety/",
        "years": years,
        "recentYears": recent,
        "national": {str(y): dict(zip(["rape", "fondling", "incest", "statutory"], national[y])) for y in years},
        "states": {s: [by_state[s][y] for y in years] for s in sorted(by_state) if s},
        "campusFields": ["name", "branch", "city", "state", "lat", "lng", "enrollment", "recent [rape, fondling, other] per recentYears"],
        "campuses": out_campuses,
    }
    for y in years:
        n = national[y]
        print(y, "rape", n[0], "fondling", n[1], "total sex offenses", sum(n), file=sys.stderr)
    print(f"{len(out_campuses)} campuses with offenses in {recent}; {missing} without coordinates", file=sys.stderr)

    with open("data/clery.js", "w") as f:
        f.write("// Generated by scripts/build_clery.py - do not edit by hand.\n")
        f.write("window.CLERY = " + json.dumps(data, separators=(",", ":")) + ";\n")


if __name__ == "__main__":
    main()
