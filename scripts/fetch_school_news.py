"""Build data/school-news/<slug>.json: news coverage of sexual assault at every campus in data/clery.js.

For each institution with reported sex offenses, searches Google News RSS for the school name together
with sexual-assault terms, keeps headlines that mention the school and an abuse term, and writes one
small JSON file per school (loaded by the site only when that school is opened). Existing files are kept
when a query fails, so a partial run never erases coverage.
Run: python scripts/fetch_school_news.py [--limit N]
"""
import argparse
import email.utils
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

from cluster_news import attach_to_cases, cluster, flatten, load_cases, set_common

OUT = "data/school-news"
TERMS = '(rape OR "sexual assault" OR "sexual abuse" OR "sexual misconduct" OR "Title IX")'
# Headlines must name sexual abuse itself; "Title IX" alone is often about sports equity.
ABUSE = re.compile(r"\b(rape[ds]?|raping|rapist|sexual(?:ly)? (?:assault|abuse|misconduct|harass|battery|exploit|contact)|sex (?:abuse|assault|crime|offen)|molest|groping|groped|fondl|indecent)", re.I)
MAX_PER_SCHOOL = 100
# Headline shorthand used by the press for some schools.
ALIASES = {
    "Louisiana State University and Agricultural & Mechanical College": ["LSU"],
    "University of California-Los Angeles": ["UCLA"],
    "University of Southern California": ["USC"],
    "North Carolina State University at Raleigh": ["NC State"],
    "Pennsylvania State University-Main Campus": ["Penn State"],
    "Ohio State University-Main Campus": ["Ohio State"],
    "Columbia University in the City of New York": ["Columbia University"],
    "Texas A&M University-College Station": ["Texas A&M"],
    "University of California-Berkeley": ["UC Berkeley"],
    "University of Michigan-Ann Arbor": ["University of Michigan"],
    "Indiana University-Bloomington": ["Indiana University"],
}


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:80]


FAMOUS_SHORT = {"Cornell", "Yale", "Stanford", "Harvard", "Duke", "Baylor", "Vanderbilt", "Dartmouth",
                "Northwestern", "Purdue", "Rutgers", "Tulane", "Emory"}
# Not used as short names because they are also town names: Georgetown, Princeton, Syracuse, Clemson, Brown.


_OWNERS = {}


def head_owner(head):
    """The institution that gets a shared system name like "Ohio State University" or "Indiana University": the one
    with the most reports, so branch campuses (Ohio State-Newark, IU-Indianapolis) don't collect main-campus news."""
    if not _OWNERS:
        for n, aliases in ALIASES.items():   # a press alias ("Indiana University" for Bloomington) decides first
            for a in aliases:
                _OWNERS.setdefault(a, n)
        for n in load_institutions():
            _OWNERS.setdefault(n.partition("-")[0].strip(), n)
    return _OWNERS.get(head)


def search_names(inst):
    """Names the press uses for a school, most specific first. Headlines must contain one of them."""
    head, _, tail = inst.partition("-")
    head, tail = head.strip(), tail.strip()
    names = []
    if head == "University of California" and tail:
        names += ["UC " + tail, "University of California, " + tail]
    elif head == "California State University" and tail:
        names += ["Cal State " + tail, "CSU " + tail]
    elif tail and re.search(r"campus$", tail, re.I) and head_owner(head) == inst:
        names.append(head)                                   # "Ohio State University-Main Campus"
    elif tail:
        names.append(head + " " + re.sub(r"\s*campus$", "", tail, flags=re.I))  # "University of Michigan Ann Arbor"
        if len(head.split()) > 1 and head_owner(head) == inst:
            names.append(head)                               # "University of Michigan" (not "Lake" from "Lake-Sumter")
    else:
        names.append(inst)
    base = names[-1] if tail and head not in ("University of California", "California State University") else names[0]
    m = re.match(r"^(?:The )?(\w+(?: \w+)? State) University$", base)
    if m:
        names.append(m.group(1))                             # "Ohio State University" -> "Ohio State"
    m = re.match(r"^(\w+) (?:University|College)$", base)
    if m and m.group(1) in FAMOUS_SHORT and base != m.group(1) + " College" or base == "Dartmouth College":
        names.append(m.group(1))                             # "Cornell University" -> "Cornell" (not "Cornell College")
    names += ALIASES.get(inst, [])
    return list(dict.fromkeys(names))


def name_pattern(names):
    """Full names match in any case; short names ("Ohio State", "Yale", "LSU") only as written, so
    "Washington state man" or "Brown County" don't count as the school."""
    full = [n for n in names if len(n.split()) > 2 or "University" in n or "College" in n]
    short = [n for n in names if n not in full]
    parts = ["(?i:%s)" % "|".join(re.escape(n) for n in full)] if full else []
    parts += [r"\b%s\b" % re.escape(n) for n in short]
    return re.compile("|".join(parts))


def fetch(query):
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode({"q": query, "hl": "en-US", "gl": "US", "ceid": "US:en"})
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (campus-assault-tracker school news build)"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                return ET.fromstring(r.read())
        except Exception as e:  # noqa: BLE001 - retry with backoff, then give up on this query
            if attempt == 3:
                raise
            time.sleep(5 * (attempt + 1))


def load_institutions():
    src = open("data/clery.js").read()
    data = json.loads(src[src.index("{"): src.rindex("}") + 1])
    totals = {}
    for c in data["campuses"]:
        totals[c[0]] = totals.get(c[0], 0) + sum(sum(v) for v in c[7])
    return sorted(totals, key=lambda n: -totals[n])


CASES = {}


def main():
    global CASES
    CASES = load_cases()
    # Word frequencies from the existing archive decide which words are too common to match a case.
    set_common(x["t"] for f in (os.listdir(OUT) if os.path.isdir(OUT) else []) if f.endswith(".json") and f != "index.json"
               for x in flatten(json.load(open(os.path.join(OUT, f)))))
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="only the N institutions with the most reports")
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    insts = load_institutions()
    if args.limit:
        insts = insts[: args.limit]
    ok = failed = total_items = 0
    index = {}
    for n, inst in enumerate(insts, 1):
        names = search_names(inst)
        name_re = name_pattern(names)
        items, seen = [], set()
        try:
            for nm in names[:2]:
                root = fetch(f'"{nm}" {TERMS}')
                for it in root.iter("item"):
                    title = (it.findtext("title") or "").strip()
                    source = (it.findtext("source") or "").strip()
                    link = (it.findtext("link") or "").strip()
                    pub = it.findtext("pubDate")
                    if not (title and link and pub):
                        continue
                    if source and title.endswith(" - " + source):
                        title = title[: -len(" - " + source)]
                    if not (ABUSE.search(title) and name_re.search(title)):
                        continue
                    key = re.sub(r"[^a-z0-9]", "", title.lower())[:80]
                    if key in seen:
                        continue
                    seen.add(key)
                    ts = int(email.utils.parsedate_to_datetime(pub).timestamp())
                    items.append({"t": title, "s": source, "u": link, "d": ts})
                time.sleep(1.2)
        except Exception as e:  # noqa: BLE001 - keep any existing file for this school
            failed += 1
            print(f"[{n}/{len(insts)}] {inst}: failed ({e})", file=sys.stderr)
            continue
        # Merge with this school's earlier archive so older stories are kept, then group same-incident headlines.
        path = os.path.join(OUT, slug(inst) + ".json")
        if os.path.exists(path):
            known = {re.sub(r"[^a-z0-9]", "", x["t"].lower())[:80] for x in items}
            # Older stories are re-checked against the school's names, so earlier false matches drop out.
            items += [x for x in flatten(json.load(open(path)))
                      if re.sub(r"[^a-z0-9]", "", x["t"].lower())[:80] not in known and name_re.search(x["t"])]
        items.sort(key=lambda x: -x["d"])
        items = attach_to_cases(cluster(items[:MAX_PER_SCHOOL], inst), CASES.get(inst, []), inst)
        ok += 1
        total_items += len(items)
        if items:
            index[inst] = len([x for x in items if "case" not in x])
            with open(os.path.join(OUT, slug(inst) + ".json"), "w") as f:
                json.dump(items, f, ensure_ascii=False, separators=(",", ":"))
        if n % 50 == 0:
            print(f"[{n}/{len(insts)}] {total_items} headlines so far", file=sys.stderr)

    # Merge with the previous index so failed or limited runs don't drop schools.
    idx_path = os.path.join(OUT, "index.json")
    prev = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
    prev.update(index)
    with open(idx_path, "w") as f:
        json.dump(prev, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    print(f"done: {ok} schools searched, {failed} failed, {total_items} headlines, {len(prev)} schools with coverage", file=sys.stderr)
    if ok == 0:
        sys.exit("every query failed")


if __name__ == "__main__":
    main()
