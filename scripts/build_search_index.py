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
    finds = [dict(f, school=names.get(f["slug"], "")) for f in finds]
    finds.sort(key=lambda f: -f["d"])
    return finds[:limit]


def main():
    slugs = {f[:-5] for d in ("data/school-news", "data/crimelog") if os.path.isdir(d)
             for f in os.listdir(d) if f.endswith(".json") and f != "index.json"}
    index = {s: "\n".join(lines_for(s)) for s in sorted(slugs)}
    index = {s: t for s, t in index.items() if t}
    with open("data/search-index.json", "w") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    with open("data/new-finds.json", "w") as f:
        json.dump(new_finds(sorted(slugs)), f, ensure_ascii=False, separators=(",", ":"))
    print(f"search index: {len(index)} schools, {sum(t.count(chr(10)) + 1 for t in index.values())} lines", flush=True)


if __name__ == "__main__":
    main()
