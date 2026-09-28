"""For each person convicted of a sex offense (data/cases.js), find a news page that actually shows their photo,
so the site can link straight to it. Writes data/photo-links.json: {name: {"url": page, "why": evidence}}.

Candidate pages: the person's coverage link, every source cited on their case, and Wikipedia articles about them.
A page counts only if it has an image whose alt text, caption, title or file name contains the person's surname
(or first + last name), or the words "mugshot"/"booking photo" next to the surname. Pages are only linked, never
copied. Run: python scripts/find_photo_pages.py   (needs network access)
"""
import json
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from html.parser import HTMLParser

UA = {"User-Agent": "Mozilla/5.0 (campus-assault-tracker photo-page check)"}


class Images(HTMLParser):
    """Collects (image url, nearby text) pairs: alt/title attributes, figure captions and og:image."""

    def __init__(self):
        super().__init__()
        self.found, self._fig, self._cap = [], [], False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta" and a.get("property", a.get("name", "")) in ("og:image", "twitter:image"):
            self.found.append((a.get("content", ""), a.get("content", "")))
        if tag == "meta" and a.get("property", a.get("name", "")) in ("og:image:alt", "twitter:image:alt"):
            self.found.append(("", a.get("content", "")))
        if tag == "img":
            src = a.get("src") or a.get("data-src") or ""
            self.found.append((src, " ".join(filter(None, [a.get("alt"), a.get("title"), src]))))
        if tag == "figcaption":
            self._cap = True

    def handle_endtag(self, tag):
        if tag == "figcaption":
            self._cap = False

    def handle_data(self, data):
        if self._cap and data.strip():
            self.found.append(("", data.strip()))


def shows_person(url, name):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
            if "html" not in r.headers.get("Content-Type", "html"):
                return None
            page = r.read(3_000_000).decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001 - a dead or blocking page just doesn't count
        print(f"  {url}: {e}", file=sys.stderr)
        return None
    parts = re.sub(r"\s+(Jr\.?|Sr\.?|I+V?)$", "", name).split()
    last, first = parts[-1].lower(), parts[0].lower()
    p = Images()
    try:
        p.feed(page)
    except Exception:  # noqa: BLE001
        return None
    for src, text in p.found:
        t = urllib.parse.unquote(text).lower().replace("-", " ").replace("_", " ")
        if last in t and (first in t or re.search(r"mug ?shot|booking|arrest|sentenc|court|photo", t)):
            return text[:140]
    return None


def main():
    out = subprocess.run(["node", "-e", 'global.window={};require("./data/cases.js");process.stdout.write(JSON.stringify(window.CASES))'],
                         capture_output=True, text=True, check=True).stdout
    people = {}
    for c in json.loads(out):
        for n in c.get("named", []):
            if not re.search(r"convict|guilty|plea", n.get("basis", ""), re.I):
                continue
            urls = people.setdefault(n["name"], [])
            for u in [n.get("photo")] + [s["url"] for s in c.get("sources", [])]:
                if u and "news.google.com" not in u and u not in urls:
                    urls.append(u)
    for name, urls in people.items():
        urls.append("https://en.wikipedia.org/wiki/" + urllib.parse.quote(name.replace(" ", "_")))
    extra = json.load(open("data/photo-pages-extra.json")) if __import__("os").path.exists("data/photo-pages-extra.json") else {}
    links = {}
    for name, urls in people.items():
        for u in extra.get(name, []) + urls:
            why = shows_person(u, name)
            if why:
                links[name] = {"url": u, "why": why}
                print(f"{name}: {u}  [{why}]", file=sys.stderr)
                break
        else:
            print(f"{name}: no page with a photo of them found", file=sys.stderr)
    json.dump(links, open("data/photo-links.json", "w"), ensure_ascii=False, indent=1, sort_keys=True)
    print(f"{len(links)} of {len(people)} convicted people have a linked page showing their photo", file=sys.stderr)


if __name__ == "__main__":
    main()
