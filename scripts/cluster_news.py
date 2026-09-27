"""Group headlines that report the same incident into one story.

Used by fetch_school_news.py before writing each school's file, and runnable on its own to re-group the
existing archive: python scripts/cluster_news.py
Each story is {"t","s","u","d", "more": [{"t","s","u","d"}, ...]} — the newest headline first, the other
outlets' coverage in "more".
"""
import glob
import json
import os
import re

STOP = set("""a an the and or of to in on at for by with from as is are was were be been after over into about
amid says said say new news report reports reported student students university college school former ex
campus alleged allegedly alleges accused case cases police sexual sexually assault assaults rape raped raping
rapes abuse abused man woman women men his her their who what when how why its it this that than more
investigation investigating charged charges arrest arrested lawsuit sues sued suit claims claim video""".split())
SYNONYMS = {"frat": "fraternity", "frats": "fraternity", "fraternities": "fraternity", "7": "seven",
            "gangraped": "gang", "drugging": "drugged", "drug": "drugged", "settles": "settlement",
            "settle": "settlement", "settled": "settlement", "1b": "billion", "nyc": "york", "manhattan": "york",
            "undergrad": "student", "graduate": "student", "teen": "student", "sexualassault": "assault",
            "settlements": "settlement", "raping": "rape", "convicted": "convict", "conviction": "convict",
            "drugged": "drugged", "fraternity": "fraternity", "urologist": "doctor", "gynecologist": "doctor",
            "physician": "doctor", "trainer": "trainer", "sentenced": "sentence"}
WINDOW = 60 * 86400  # headlines more than 60 days apart are treated as separate stories
WEEK = 7 * 86400


def tokens(title, school_words):
    words = re.findall(r"[a-z0-9]+", title.lower().replace("gang-raped", "gang raped"))
    out = set()
    for w in words:
        w = SYNONYMS.get(w, w)
        if len(w) < 3 and w not in ("7",) or w in STOP or w in school_words:
            continue
        out.add(w)
    return out


SHORT_NAMES = {
    "Louisiana State University and Agricultural & Mechanical College": "lsu", "University of California-Los Angeles": "ucla",
    "University of Southern California": "usc", "Brigham Young University": "byu", "University of North Carolina at Chapel Hill": "unc",
    "North Carolina State University at Raleigh": "ncsu", "Florida State University": "fsu", "Utah State University": "usu",
    "Michigan State University": "msu", "Ohio State University-Main Campus": "osu", "Pennsylvania State University-Main Campus": "psu",
    "Texas A&M University-College Station": "tamu", "Indiana University-Bloomington": "iu", "University of Virginia-Main Campus": "uva",
    "University of Utah": "uofu", "Texas Tech University": "ttu",
}


def school_word_set(school_name):
    words = set(re.findall(r"[a-z0-9]+", school_name.lower()))
    if school_name in SHORT_NAMES:
        words.add(SHORT_NAMES[school_name])
    return words


def cluster(items, school_name=""):
    school_words = school_word_set(school_name)
    items = sorted(items, key=lambda n: -n["d"])
    stories = []  # each: {"head": item, "more": [...], "tok": {token: count}, "d": latest ts, "d0": earliest}
    for n in items:
        t = tokens(n["t"], school_words)
        best, best_score = None, 0
        for st in stories:
            gap = st["d0"] - n["d"]          # stories are built newest-first
            if gap > WINDOW:
                continue
            shared = sum(1 for w in t if w in st["tok"])
            score = shared / max(1, min(len(t), 6))
            if gap <= WEEK and (shared >= 1 or len(t) <= 1):
                # Same school, same week: one shared distinctive word (or a generic headline) is enough.
                score += 1 + len(st["more"]) / 100.0   # prefer the week's biggest story
            elif not (shared >= 2 and score >= 0.34):
                continue
            if score > best_score:
                best, best_score = st, score
        if best:
            best["more"].append(n)
            best["d0"] = min(best["d0"], n["d"])
            for w in t:
                best["tok"][w] = best["tok"].get(w, 0) + 1
        else:
            stories.append({"head": n, "more": [], "tok": {w: 1 for w in t}, "d": n["d"], "d0": n["d"]})
    out = []
    for st in stories:
        h = dict(st["head"])
        h.pop("more", None)
        if st["more"]:
            h["more"] = [{k: m[k] for k in ("t", "s", "u", "d")} for m in st["more"]]
        out.append(h)
    return out


def load_cases():
    """Case entries from data/cases.js, grouped by institution name (the part of `clery` before '|')."""
    src = open("data/cases.js").read()
    arr = src[src.index("window.CASES = ") + len("window.CASES = "): src.rindex("];") + 1]
    # cases.js is JavaScript, not JSON: evaluate it with node for exactness.
    import subprocess
    out = subprocess.run(["node", "-e", 'global.window={};require("./data/cases.js");process.stdout.write(JSON.stringify(window.CASES))'],
                         capture_output=True, text=True, check=True).stdout
    by_inst = {}
    for c in json.loads(out):
        by_inst.setdefault(c["clery"].split("|")[0], []).append(c)
    return by_inst


# Words too common in campus sexual-assault headlines to identify a specific case.
GENERIC = set("""fraternity sentenced sentence convict guilty doctor professor football player players coach athlete
athletes trial jury judge settlement lawsuit prison years jail plea pleads pleaded suspended expelled title
federal justice department education survivors victims victim officials report sorority house dorm hall
party night 2020 2021 2022 2023 2024 2025 2026 prevention awareness policy policies program task force""".split())


COMMON = set()   # words found in many headlines across all schools; filled by set_common()


def set_common(all_titles, min_df=15):
    """Words appearing in min_df+ headlines can't identify a specific case."""
    df = {}
    for title in all_titles:
        for w in tokens(title, set()):
            df[w] = df.get(w, 0) + 1
    COMMON.clear()
    COMMON.update(w for w, n in df.items() if n >= min_df)


def attach_to_cases(stories, cases, school_name):
    """Mark stories that report on a documented case with that case's id (shown inside the case, not as a row)."""
    school_words = school_word_set(school_name)
    def case_text(c):
        extra = " ".join(n["name"] for n in c.get("named", [])) + " " + " ".join(c.get("keywords", []))
        return c["title"] + " " + c["summary"] + " " + extra
    case_tok = [(c, tokens(case_text(c), school_words)) for c in cases]
    case_kw = {c["id"]: tokens(" ".join(c.get("keywords", [])), school_words) for c in cases}
    case_names = {c["id"]: [tokens(n["name"], set()) for n in c.get("named", [])] for c in cases}
    for st in stories:
        best, best_shared = None, 0
        heads = [st] + st.get("more", [])
        t = set().union(*[tokens(h["t"], school_words) for h in heads])
        year = __import__("time").gmtime(st["d"]).tm_year
        for c, ct in case_tok:
            if year < int(c.get("year") or 0):
                continue
            shared = t & ct
            distinctive = shared - GENERIC - COMMON
            # Need two uncommon shared words (names, places, specifics).
            outcome = shared & {"convict", "sentence", "charged", "indicted", "settlement", "guilty", "expelled"}
            # A case keyword, or a convicted person's full name, identifies the case.
            keyword_hit = bool(t & case_kw[c["id"]]) or any(nm and nm <= t for nm in case_names[c["id"]])
            ok = len(distinctive - set().union(*case_names[c["id"]]) if case_names[c["id"]] else distinctive) >= 2 or keyword_hit or (str(c.get("year")) in shared and outcome and len(shared) >= 2)
            if ok and len(shared) > best_shared:
                best, best_shared = c, len(shared)
        if best:
            st["case"] = best["id"]
    return stories


def flatten(items):
    """Undo a previous grouping so the archive can be re-grouped."""
    flat = []
    for n in items:
        flat.append({k: n[k] for k in ("t", "s", "u", "d")})
        flat.extend(n.get("more", []))
    return flat


def main():
    root = "data/school-news"
    idx_path = os.path.join(root, "index.json")
    index = json.load(open(idx_path))
    by_slug = {re.sub(r"[^a-z0-9]+", "-", k.lower()).strip("-")[:80]: k for k in index}
    cases = load_cases()
    files = [f for f in glob.glob(os.path.join(root, "*.json")) if not f.endswith("index.json")]
    set_common(x["t"] for f in files for x in flatten(json.load(open(f))))
    before = after = 0
    for f in glob.glob(os.path.join(root, "*.json")):
        slug = os.path.basename(f)[:-5]
        if slug == "index":
            continue
        items = flatten(json.load(open(f)))
        before += len(items)
        inst = by_slug.get(slug, "")
        stories = attach_to_cases(cluster(items, inst), cases.get(inst, []), inst)
        rows = [x for x in stories if "case" not in x]
        after += len(rows)
        json.dump(stories, open(f, "w"), ensure_ascii=False, separators=(",", ":"))
        if inst:
            index[inst] = len(rows)   # the site shows one row per story not already attached to a case
    json.dump(index, open(idx_path, "w"), ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    print(f"{before} headlines grouped into stories; {after} shown as their own rows (others attached to cases)")


if __name__ == "__main__":
    main()
