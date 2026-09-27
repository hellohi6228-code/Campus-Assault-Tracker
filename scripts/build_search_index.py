"""Build data/search-index.json so the site's search bar finds text inside every school's news archive and
Daily Crime Log entries without downloading all of them: {school slug: "one line per headline or log entry"}.
Run: python scripts/build_search_index.py   (after fetch_school_news.py / fetch_crime_logs.py)
"""
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


def main():
    slugs = {f[:-5] for d in ("data/school-news", "data/crimelog") if os.path.isdir(d)
             for f in os.listdir(d) if f.endswith(".json") and f != "index.json"}
    index = {s: "\n".join(lines_for(s)) for s in sorted(slugs)}
    index = {s: t for s, t in index.items() if t}
    with open("data/search-index.json", "w") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    print(f"search index: {len(index)} schools, {sum(t.count(chr(10)) + 1 for t in index.values())} lines", flush=True)


if __name__ == "__main__":
    main()
