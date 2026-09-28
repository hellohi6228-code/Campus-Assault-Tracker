"""Build data/search-index.json and data/new-finds.json (the newest stories and crime-log reports across all
schools, shown in the "New finds" box).

data/search-index.json so the site's search bar finds text inside every school's news archive and
Daily Crime Log entries without downloading all of them: {school slug: "one line per headline or log entry"}.
Run: python scripts/build_search_index.py   (after fetch_school_news.py / fetch_crime_logs.py)
"""
import datetime
import re
import json
import os

from cluster_news import flatten


def lines_for(slug):
    lines = []
    path = os.path.join("data/school-news", slug + ".json")
    if os.path.exists(path):
        lines += [f'{x["t"]} ({x.get("s", "")})' for x in flatten(json.load(open(path)))]
    path = os.path.join("data/crimelog", slug + ".json")
    if os.path.exists(path):
        for e in json.load(open(path)):
            lines.append(" · ".join(filter(None, [e.get("nature"), ", ".join(e.get("offenses", [])), e.get("location"),
                                                   e.get("disposition"), e.get("id"), e.get("reported")])))
    return list(dict.fromkeys(l.replace("\n", " ") for l in lines if l))


def school_names():
    """slug -> institution name, from the federal campus list."""
    src = open("data/clery.js").read()
    data = json.loads(src[src.index("{"): src.rindex("}") + 1])
    return {re.sub(r"[^a-z0-9]+", "-", c[0].lower()).strip("-")[:80]: c[0] for c in data["campuses"]}


def new_finds(slugs, limit=20):
    names = school_names()
    finds = []
    for slug in slugs:
        path = os.path.join("data/school-news", slug + ".json")
        if os.path.exists(path):
            for x in json.load(open(path)):   # grouped stories: one row per incident
                finds.append({"k": "news", "t": x["t"], "s": x.get("s", ""), "u": x["u"], "d": x["d"], "slug": slug})
        path = os.path.join("data/crimelog", slug + ".json")
        if os.path.exists(path):
            for e in json.load(open(path)):
                try:
                    d = int(datetime.datetime.strptime(e["reported"][:10], "%m/%d/%Y").timestamp())
                except (KeyError, ValueError):
                    continue
                finds.append({"k": "log", "t": e.get("nature") or ", ".join(e.get("offenses", [])),
                              "s": "Campus police crime log", "d": d, "slug": slug})
    # National feed (data/news.js, refreshed every 6 hours): newest headlines, linked to the school they name.
    if os.path.exists("data/news.js"):
        from fetch_school_news import load_institutions, name_pattern, search_names
        src = open("data/news.js").read()
        items = json.loads(src[src.index("{"): src.rindex("}") + 1]).get("items", [])
        pats = [(n, name_pattern(search_names(n))) for n in load_institutions()[:600]]
        seen = {re.sub(r"[^a-z0-9]", "", f["t"].lower())[:60] for f in finds}
        for x in items:
            key = re.sub(r"[^a-z0-9]", "", x["t"].lower())[:60]
            if key in seen:
                continue
            seen.add(key)
            inst = next((n for n, p in pats if p.search(x["t"])), "")
            finds.append({"k": "news", "t": x["t"], "s": x.get("s", ""), "u": x["u"], "d": x["d"],
                          "slug": re.sub(r"[^a-z0-9]+", "-", inst.lower()).strip("-")[:80] if inst else ""})
    finds = [dict(f, school=names.get(f["slug"], "")) for f in finds if f["slug"]]
    finds.sort(key=lambda f: -f["d"])
    # One story per school per day, so several outlets covering the same story don't fill the box.
    out, seen = [], set()
    for f in finds:
        key = (f["slug"], f["d"] // 86400)
        if key not in seen:
            seen.add(key)
            out.append(f)
    return out[:limit]


def main():
    slugs = {f[:-5] for d in ("data/school-news", "data/crimelog") if os.path.isdir(d)
             for f in os.listdir(d) if f.endswith(".json") and f != "index.json"}
    index = {s: "\n".join(lines_for(s)) for s in sorted(slugs)}
    index = {s: t for s, t in index.items() if t}
    with open("data/search-index.json", "w") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    with open("data/new-finds.json", "w") as f:
        json.dump(new_finds(sorted(slugs)), f, ensure_ascii=False, separators=(",", ":"))
    # Guard: every school's list count must equal the stories that open for it.
    idx = json.load(open("data/school-news/index.json"))
    wrong = []
    for name, n in idx.items():
        path = os.path.join("data/school-news", re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:80] + ".json")
        shown = len([x for x in json.load(open(path)) if "case" not in x]) if os.path.exists(path) else 0
        if shown != n:
            wrong.append(f"{name}: index {n}, file {shown}")
    if wrong:
        raise SystemExit("news counts do not match files:\n" + "\n".join(wrong))
    print(f"search index: {len(index)} schools, {sum(t.count(chr(10)) + 1 for t in index.values())} lines", flush=True)


if __name__ == "__main__":
    main()
