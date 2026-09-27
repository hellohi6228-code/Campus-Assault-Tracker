"""Collect sex-offense entries from university Daily Crime Logs into data/crimelog/<school>.json.

The Clery Act requires every campus police department to keep a public Daily Crime Log (one row per
report: incident number, date reported, date occurred, nature, location, disposition — never names).
Most schools only keep the last 60 days online, so this runs daily and keeps every entry it has seen,
updating the disposition when it changes. Each school needs an adapter because every log looks different.
Run: python scripts/fetch_crime_logs.py   (needs `pip install playwright && playwright install chromium`)
"""
import json
import os
import re
import sys
import time

from playwright.sync_api import sync_playwright

OUT = "data/crimelog"
SEX = re.compile(r"\b(RAPE|SEXUAL|SEX OFF|FONDL|INDECENT|INCEST|STATUTORY|SODOMY|DEVIATE)", re.I)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:80]


# ---- Penn State: https://www.police.psu.edu/daily-crime-log ----
# The site is behind a bot check, so we only read what an ordinary visitor sees: the first page (the
# newest ~20 entries, all campuses). Running every few hours catches every new entry. The incident-number
# prefix identifies the campus (e.g. 26UP04348 = University Park).
PSU_PREFIX = {
    "UP": "Pennsylvania State University-Main Campus",
    "AB": "Pennsylvania State University-Penn State Abington",
    "AA": "Pennsylvania State University-Penn State Altoona",
    "BR": "Pennsylvania State University-Penn State Berks",
    "BW": "Pennsylvania State University-Penn State Brandywine",
    "ER": "Pennsylvania State University-Penn State Erie-Behrend College",
    "HB": "Pennsylvania State University-Penn State Harrisburg",
    "HN": "Pennsylvania State University-Penn State Hazleton",
    "YK": "Pennsylvania State University-Penn State York",
}
# Campus names that appear in the LOCATION field, used when a prefix is not in PSU_PREFIX.
PSU_LOCATION = {
    "ABINGTON": "Pennsylvania State University-Penn State Abington", "ALTOONA": "Pennsylvania State University-Penn State Altoona",
    "BEAVER": "Pennsylvania State University-Penn State Beaver", "BEHREND": "Pennsylvania State University-Penn State Erie-Behrend College",
    "BERKS": "Pennsylvania State University-Penn State Berks", "BRANDYWINE": "Pennsylvania State University-Penn State Brandywine",
    "FAYETTE": "Pennsylvania State University-Penn State Fayette- Eberly", "GREATER ALLEGHENY": "Pennsylvania State University-Penn State Greater Allegheny",
    "HARRISBURG": "Pennsylvania State University-Penn State Harrisburg", "HAZLETON": "Pennsylvania State University-Penn State Hazleton",
    "SCHUYLKILL": "Pennsylvania State University-Penn State Schuylkill", "WILKES-BARRE": "Pennsylvania State University-Penn State Wilkes-Barre",
    "SCRANTON": "Pennsylvania State University-Penn State Scranton", "YORK": "Pennsylvania State University-Penn State York",
}
FIELDS = ["REPORTED", "OCCURRED", "NATURE OF INCIDENT", "OFFENSES", "LOCATION", "CASE DISPOSITION"]


def parse_psu(text):
    """The rendered log is a sequence of blocks starting with 'INCIDENT #: xxx' followed by labelled fields."""
    entries = []
    for block in re.split(r"\n\s*INCIDENT #:\s*", "\n" + text)[1:]:
        lines = [l.strip() for l in block.split("\n") if l.strip()]
        if not lines:
            continue
        e = {"id": lines[0]}
        cur = None
        for l in lines[1:]:
            if l in FIELDS:
                cur = l
                e.setdefault(cur, [])
            elif cur:
                e[cur].append(l)
        if "REPORTED" not in e:
            continue
        entries.append({
            "id": e["id"],
            "reported": " ".join(e.get("REPORTED", [])),
            "occurred": " ".join(e.get("OCCURRED", [])),
            "nature": " ".join(e.get("NATURE OF INCIDENT", [])),
            "offenses": e.get("OFFENSES", []),
            "location": " ".join(e.get("LOCATION", [])),
            "disposition": " ".join(e.get("CASE DISPOSITION", [])),
        })
    return entries


def load(page, url, marker="INCIDENT #"):
    """Open a log page and wait until entries (or an empty result) have rendered; retry twice."""
    for attempt in range(3):
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            try:
                page.wait_for_function(f"document.body.innerText.includes({json.dumps(marker)})", timeout=20000)
            except Exception:  # noqa: BLE001 - an empty page has no marker; read what is there
                pass
            return page.inner_text("body")
        except Exception as e:  # noqa: BLE001
            print(f"  retry {attempt + 1} {url}: {e.__class__.__name__}", file=sys.stderr)
            time.sleep(5)
    return ""


def fetch_psu(page):
    """Yield (institution, entries) from the first page of the Penn State log."""
    text = load(page, "https://www.police.psu.edu/daily-crime-log")
    groups = {}
    for e in parse_psu(text):
        m = re.match(r"\d{2}([A-Z]{2})\d+", e["id"])
        inst = PSU_PREFIX.get(m.group(1)) if m else None
        if not inst:
            inst = next((v for k, v in PSU_LOCATION.items() if k in e["location"].upper()), None)
        if not inst:
            print(f"PSU: campus unknown for {e['id']} ({e['location']}); skipped", file=sys.stderr)
            continue
        groups.setdefault(inst, []).append(e)
    print(f"PSU: {sum(len(v) for v in groups.values())} log entries read", file=sys.stderr)
    yield from groups.items()


ADAPTERS = [("Penn State", fetch_psu)]


def merge(inst, entries):
    """Keep every sex-offense entry ever seen; refresh fields of entries seen again."""
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, slug(inst) + ".json")
    store = {e["id"]: e for e in (json.load(open(path)) if os.path.exists(path) else [])}
    now = time.strftime("%Y-%m-%d")
    added = 0
    for e in entries:
        if not (SEX.search(" ".join(e["offenses"])) or SEX.search(e["nature"])):
            continue
        old = store.get(e["id"])
        if not old:
            added += 1
            e["first_seen"] = now
        else:
            e["first_seen"] = old.get("first_seen", now)
        e["last_seen"] = now
        store[e["id"]] = e
    if store:
        rows = sorted(store.values(), key=lambda x: x["id"], reverse=True)
        json.dump(rows, open(path, "w"), ensure_ascii=False, indent=0)
    return added, len(store)


def main():
    ok = 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(user_agent=UA)
        for name, fn in ADAPTERS:
            try:
                for inst, entries in fn(page):
                    added, total = merge(inst, entries)
                    ok += 1 if entries else 0
                    print(f"{inst}: +{added} new sex-offense entries, {total} stored", file=sys.stderr)
            except Exception as e:  # noqa: BLE001 - one broken adapter must not stop the others
                print(f"{name}: adapter failed: {e}", file=sys.stderr)
        browser.close()
    # Index of schools with stored entries, so the site knows which files exist.
    os.makedirs(OUT, exist_ok=True)
    index = {}
    for f in os.listdir(OUT) if os.path.isdir(OUT) else []:
        if f.endswith(".json") and f != "index.json":
            index[f[:-5]] = len(json.load(open(os.path.join(OUT, f))))
    json.dump(index, open(os.path.join(OUT, "index.json"), "w"), sort_keys=True)
    if not ok:
        sys.exit("no log entries could be read from any school")


if __name__ == "__main__":
    main()
