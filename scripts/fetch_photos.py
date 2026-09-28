"""Find freely licensed photos of people named in data/cases.js (people convicted in court) and write
data/photos.js: window.PHOTOS = {name: {"src", "page", "credit", "license"}}.

Sources, in order: government-released photos listed in data/official-photos.json (public records, copied into
data/photos/), then a freely licensed image (public domain, CC0, CC BY, CC BY-SA) from a Wikipedia article about
the person's case whose file name names them. News-agency photos are never copied.
Run: python scripts/fetch_photos.py   (needs network access to wikipedia.org and wikimedia.org)
"""
import html
import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request

UA = {"User-Agent": "campus-assault-tracker/1.0 (photo lookup; https://github.com/hellohi6228-code/Campus-Assault-Tracker)"}
FREE = re.compile(r"^(public domain|pd|cc0|cc[- ]by(-sa)?( \d\.\d)?)", re.I)
# Article titles to try, in order, when a person's own article doesn't exist or has no image.
EXTRA_TITLES = {"Brock Turner": ["People v. Turner"], "Tevin Elliott": ["Tevin Elliot"]}


def api(host, **params):
    params.update(format="json", formatversion="2")
    url = f"https://{host}/w/api.php?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return json.load(r)


def lead_image(title):
    d = api("en.wikipedia.org", action="query", prop="pageimages", piprop="name", titles=title, redirects=1)
    pages = d.get("query", {}).get("pages", [])
    return pages[0].get("pageimage") if pages and not pages[0].get("missing") else None


def image_info(filename):
    """License and URL of a file, looked up on Commons first, then on English Wikipedia (local uploads)."""
    for host in ("commons.wikimedia.org", "en.wikipedia.org"):
        d = api(host, action="query", prop="imageinfo", titles="File:" + filename,
                iiprop="url|extmetadata", iiurlwidth="240")
        pages = d.get("query", {}).get("pages", [])
        if not pages or pages[0].get("missing") or not pages[0].get("imageinfo"):
            continue
        ii = pages[0]["imageinfo"][0]
        meta = ii.get("extmetadata", {})
        lic = html.unescape(re.sub("<[^>]+>", "", meta.get("LicenseShortName", {}).get("value", ""))).strip()
        artist = html.unescape(re.sub("<[^>]+>", "", meta.get("Artist", {}).get("value", ""))).strip()
        nonfree = meta.get("NonFree", {}).get("value", "")
        return {"src": ii.get("thumburl") or ii["url"], "page": ii.get("descriptionurl"), "license": lic,
                "credit": artist if artist and not artist.startswith("http") else "Wikimedia Commons", "free": bool(FREE.match(lic)) and nonfree != "true"}
    return None


def article_images(title):
    d = api("en.wikipedia.org", action="query", prop="images", imlimit="50", titles=title, redirects=1)
    pages = d.get("query", {}).get("pages", [])
    return [i["title"].split(":", 1)[1] for i in (pages[0].get("images", []) if pages else [])]


def about_case(title):
    """True if the Wikipedia article is about a sexual-abuse case (so a same-named person is never used)."""
    d = api("en.wikipedia.org", action="query", prop="extracts", exintro=1, explaintext=1, titles=title, redirects=1)
    pages = d.get("query", {}).get("pages", [])
    text = pages[0].get("extract", "") if pages and not pages[0].get("missing") else ""
    return bool(re.search(r"\b(rape|raping|sexual(ly)? (assault|abuse|abused|battery|misconduct)|sex offender|molest)", text, re.I))


def names_person(filename, name):
    """A file is used only if its name contains the person's first and last name, so a building, logo or
    someone else with the same surname is never shown."""
    parts = re.sub(r"\s+(Jr\.?|Sr\.?|I+V?)$", "", name).split()
    fn = re.sub(r"[_\-.]", " ", filename).lower()
    return parts[0].lower() in fn and parts[-1].lower() in fn


def download_official(name, entry):
    """Government-released photos (booking photos, prison/registry photos) listed in data/official-photos.json
    are public records; they are copied into data/photos/ so the site doesn't depend on the agency's site."""
    os.makedirs("data/photos", exist_ok=True)
    ext = os.path.splitext(urllib.parse.urlparse(entry["url"]).path)[1].lower() or ".jpg"
    path = "data/photos/" + re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") + ext
    with urllib.request.urlopen(urllib.request.Request(entry["url"], headers=UA), timeout=60) as r:
        open(path, "wb").write(r.read())
    return {"src": path, "page": entry.get("page", entry["url"]), "credit": entry["credit"], "license": "Public record"}


def main():
    out = subprocess.run(["node", "-e", 'global.window={};require("./data/cases.js");process.stdout.write(JSON.stringify(window.CASES))'],
                         capture_output=True, text=True, check=True).stdout
    names = []
    for c in json.loads(out):
        for n in c.get("named", []):
            if re.search(r"convict|guilty", n.get("basis", ""), re.I) and n["name"] not in names:
                names.append(n["name"])
    official = json.load(open("data/official-photos.json")) if os.path.exists("data/official-photos.json") else {}
    photos = {}
    for name in names:
        if name in official:
            try:
                photos[name] = download_official(name, official[name])
                print(f"{name}: official photo from {official[name]['url']}", file=sys.stderr)
                continue
            except Exception as e:  # noqa: BLE001 - fall back to the Commons search
                print(f"{name}: official photo download failed: {e}", file=sys.stderr)
        # Only images from a Wikipedia article about this person's case. A Commons-wide name search matched
        # other people with the same name (a musician, an athlete, a 19th-century soldier), so it is not used.
        candidates = []
        for title in [name] + EXTRA_TITLES.get(name, []):
            try:
                if about_case(title):
                    candidates += [lead_image(title)] + article_images(title)
                else:
                    print(f"{name}: article {title!r} missing or not about the case; skipped", file=sys.stderr)
            except Exception as e:  # noqa: BLE001 - one failed lookup shouldn't stop the rest
                print(f"{name}: article lookup failed for {title}: {e}", file=sys.stderr)
        found = None
        for f in dict.fromkeys(c for c in candidates if c and names_person(c, name)):
            try:
                info = image_info(f)
            except Exception as e:  # noqa: BLE001
                print(f"{name}: {f}: {e}", file=sys.stderr)
                continue
            if info:
                print(f"{name}: {f} [{info['license']}] free={info['free']}", file=sys.stderr)
                if info["free"]:
                    found = {k: info[k] for k in ("src", "page", "credit", "license")}
                    found["src"] = found["src"].split("?")[0]
                    break
        if found:
            photos[name] = found
        else:
            print(f"{name}: no usable photo found", file=sys.stderr)
    with open("data/photos.js", "w") as fh:
        fh.write("// Generated by scripts/fetch_photos.py - photos of people convicted in court.\n")
        fh.write("window.PHOTOS = " + json.dumps(photos, ensure_ascii=False, indent=1, sort_keys=True) + ";\n")
    print(f"{len(photos)} of {len(names)} convicted individuals have a photo", file=sys.stderr)


if __name__ == "__main__":
    main()
