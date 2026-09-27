"""Build data/clery.js from the US Dept. of Education Campus Safety and Security (Clery Act) data.

Downloads the official "all institutions" Excel releases from ope.ed.gov and the IPEDS directory
file (for campus coordinates), then writes per-campus and national/state totals of reported sex
offenses. Run: python scripts/build_clery.py  (needs network access to ope.ed.gov and nces.ed.gov)

Counting method: Clery geography "total" = on-campus + noncampus + public property (residence-hall
counts are a subset of on-campus and are not added). Sex offenses = rape + fondling + incest +
statutory rape, as defined in the Clery Act.
"""
import io
import json
import re
import sys
import urllib.request
import zipfile
from collections import defaultdict

import pandas as pd

API = "https://ope.ed.gov/campussafety/api/dataFiles/file?fileName="
# Each release covers three calendar years; together these span 2016-2024.
RELEASES = ["Crime2019EXCEL.zip", "Crime2022EXCEL.zip", "Crime2025EXCEL.zip"]
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
        hd = pd.read_csv(io.BytesIO(zf.read(csv)), encoding="latin1", usecols=lambda c: c.upper() in ("UNITID", "LATITUDE", "LONGITUD"))
        hd.columns = [c.upper() for c in hd.columns]
        print(f"IPEDS {d}: {len(hd)} institutions", file=sys.stderr)
        return {int(r.UNITID): (round(float(r.LATITUDE), 4), round(float(r.LONGITUD), 4))
                for r in hd.itertuples() if pd.notna(r.LATITUDE) and pd.notna(r.LONGITUD)}
    raise RuntimeError("could not load IPEDS directory file")


def main():
    campuses = {}  # UNITID_P -> info
    counts = defaultdict(lambda: defaultdict(lambda: [0, 0, 0, 0]))  # UNITID_P -> year -> offenses
    years = set()
    col_re = re.compile(r"^(%s)(\d\d)$" % "|".join(OFFENSES))

    for rel in RELEASES:
        print("downloading", rel, file=sys.stderr)
        zf = zipfile.ZipFile(io.BytesIO(fetch(API + rel)))
        rel_years = set()
        for geo in GEOS:
            df = read_table(zf, geo)
            df.columns = [str(c).strip() for c in df.columns]
            for r in df.to_dict("records"):
                uid = int(r["UNITID_P"])
                campuses[uid] = {
                    "name": str(r["INSTNM"]).strip(),
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
                    counts[uid][yr][OFFENSES.index(m.group(1))] += int(val)
        # A later release supersedes earlier ones for overlapping years (none overlap today).
        years |= rel_years
        print(rel, "years", sorted(rel_years), file=sys.stderr)

    years = sorted(years)
    coords = load_coords()

    national = {y: [0, 0, 0, 0] for y in years}
    by_state = defaultdict(lambda: {y: 0 for y in years})
    recent = years[-3:]
    out_campuses = []
    missing = 0
    for uid, info in campuses.items():
        per_year = counts.get(uid, {})
        for y in years:
            v = per_year.get(y, [0, 0, 0, 0])
            for i in range(4):
                national[y][i] += v[i]
            by_state[info["state"]][y] += sum(v)
        recent_vals = [per_year.get(y, [0, 0, 0, 0]) for y in recent]
        if not any(sum(v) for v in recent_vals):
            continue
        ll = coords.get(uid // 1000)
        if not ll:
            missing += 1
            continue
        out_campuses.append([
            info["name"], info["branch"], info["city"], info["state"], ll[0], ll[1], info["enroll"],
            [v[:2] + [v[2] + v[3]] for v in recent_vals],  # [rape, fondling, incest+statutory] per recent year
        ])

    out_campuses.sort(key=lambda c: -sum(sum(v) for v in c[7]))
    data = {
        "source": "U.S. Department of Education, Campus Safety and Security Survey (Clery Act), releases " + ", ".join(RELEASES),
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
