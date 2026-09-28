"""For each person convicted of a sex offense (data/cases.js), find a news page that actually shows their photo,
so the site can link straight to it. Writes data/photo-links.json: {name: {"url": page, "why": evidence}}.

Candidate pages: the person's coverage link, every source cited on their case, and Wikipedia articles about them.
A page counts only if one of its images is named after the person, is labelled with just their name, or has a caption
saying the picture shows them ("X appears in court", "X mugshot"); a caption that only tells the story doesn't count. Pages are only linked, never
copied. Run: python scripts/find_photo_pages.py   (needs network access)
"""
import json
import re
import subprocess
import sys
import time
import urllib.error
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


def fetch(url):
    """Page HTML, retrying once after a pause when a site rate-limits us (HTTP 429)."""
    for attempt in range(2):
        try:
            time.sleep(1.5)
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                if "html" not in r.headers.get("Content-Type", "html"):
                    return None
                return r.read(3_000_000).decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt == 0:
                time.sleep(20)
                continue
            print(f"  {url}: {e}", file=sys.stderr)
            return None
        except Exception as e:  # noqa: BLE001 - a dead or blocking page just doesn't count
            print(f"  {url}: {e}", file=sys.stderr)
            return None
    return None


def shows_person(url, name):
    page = fetch(url)
    if page is None:
        return None
    parts = re.sub(r"\s+(Jr\.?|Sr\.?|I+V?)$", "", name).split()
    last, first = parts[-1].lower(), parts[0].lower()
    p = Images()
    try:
        p.feed(page)
    except Exception:  # noqa: BLE001
        return None
    for src, text in p.found:
        if depicts(src, text, first, last):
            return text[:140]
    return None


# A caption only counts when it describes what the picture shows ("X appears in court", "X is led away",
# "X (left)", "X mugshot"), never when it just tells the story ("X was convicted at the courthouse" is
# usually a photo of the courthouse).
DEPICTS = r"appears?|is (?:led|escorted|seen|shown|pictured|taken)|as he|plays?|sits?|stands?|walks?|listens?|looks?|enters?|leaves?|speaks?|pictured|\((?:left|right|center)\)|mug ?shot|booking (?:photo|image)|jail photo"
STORY = r"convict|sentenc|guilty|charge|settle|lawsuit|rape|assault|court|case"


def depicts(src, text, first, last):
    norm = lambda x: urllib.parse.unquote(x).lower().replace("-", " ").replace("_", " ")
    files = []
    for u in [src] + urllib.parse.parse_qs(urllib.parse.urlparse(src).query).get("url", []) if src else []:
        files.append(urllib.parse.urlparse(u).path.rsplit("/", 1)[-1])   # image CDNs often wrap the real file in ?url=
    files += re.findall(r"[\w.%-]+\.(?:jpe?g|png|webp|gif)\b", text, re.I)
    for f in map(norm, files):
        if re.search(r"\b" + re.escape(last) + r"\b", f) or (len(last) >= 5 and last in f.replace(" ", "")):
            return True                               # the image file itself is named after them
    t = norm(re.sub(r"https?://\S+|\S+\.(?:jpe?g|png|webp|gif)\b", "", text, flags=re.I)).strip()
    if not re.search(r"\b" + re.escape(last) + r"\b", t):
        return False
    if len(re.sub(r"\([^)]*\)", "", t).split()) <= 6 and re.search(r"\b" + re.escape(first) + r"\b", t) and not re.search(STORY, t):
        return True                                   # a bare name label: "Jaylen King", "X (County Jail)"
    lead = t.split(". ")[0]                           # first sentence of the caption, with them as its subject
    return bool(re.search(r"\b" + re.escape(last) + r"\b", " ".join(lead.split()[:6])) and re.search(r"(?<!\w)(?:" + DEPICTS + r")(?!\w)", lead))


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
