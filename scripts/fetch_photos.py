"""Find freely licensed photos of people named in data/cases.js (people convicted in court) and write
data/photos.json: {name: {"src", "page", "credit", "license"}}.

Only images whose license allows reuse (public domain, CC0, CC BY, CC BY-SA) are kept, so the site can
display them with attribution. Non-free images (e.g. Wikipedia "fair use" uploads, news photos) are skipped.
Run: python scripts/fetch_photos.py   (needs network access to wikipedia.org and wikimedia.org)
"""
import html
import json
import re
import subprocess
import sys
import urllib.parse
import urllib.request

UA = {"User-Agent": "campus-assault-tracker/1.0 (photo lookup; https://github.com/hellohi6228-code/Campus-rape-heat-map-)"}
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
                "credit": artist or "Wikimedia Commons", "free": bool(FREE.match(lic)) and nonfree != "true"}
    return None


def main():
    out = subprocess.run(["node", "-e", 'global.window={};require("./data/cases.js");process.stdout.write(JSON.stringify(window.CASES))'],
                         capture_output=True, text=True, check=True).stdout
    names = []
    for c in json.loads(out):
        for n in c.get("named", []):
            if re.search(r"convict|guilty", n.get("basis", ""), re.I) and n["name"] not in names:
                names.append(n["name"])
    photos = {}
    for name in names:
        found = None
        for title in [name] + EXTRA_TITLES.get(name, []):
            try:
                f = lead_image(title)
                info = image_info(f) if f else None
            except Exception as e:  # noqa: BLE001 - one failed lookup shouldn't stop the rest
                print(f"{name}: lookup failed for {title}: {e}", file=sys.stderr)
                continue
            if info:
                print(f"{name}: {title} -> {f} [{info['license']}] free={info['free']}", file=sys.stderr)
                if info["free"]:
                    found = {k: info[k] for k in ("src", "page", "credit", "license")}
                    break
        if found:
            photos[name] = found
        else:
            print(f"{name}: no freely licensed photo", file=sys.stderr)
    json.dump(photos, open("data/photos.json", "w"), ensure_ascii=False, indent=1, sort_keys=True)
    print(f"{len(photos)} of {len(names)} convicted individuals have a freely licensed photo", file=sys.stderr)


if __name__ == "__main__":
    main()
