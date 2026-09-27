(function () {
  "use strict";

  var CLERY = window.CLERY || { campuses: [], recentYears: [], years: [], national: {} };
  var CASES = window.CASES || [];
  var PROCESS = window.PROCESS || {};
  var NEWS = window.NEWS || null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function num(n) { return Number(n || 0).toLocaleString("en-US"); }
  function money(n) {
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    return "$" + Math.round(n / 1e3) + "K";
  }
  function fmtDate(ts) { return new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

  // ---- Universities: one row per campus in the federal data ----
  var years = CLERY.recentYears;
  var span = years.length ? years[0] + "–" + years[years.length - 1] : "";
  var nameCount = {};
  CLERY.campuses.forEach(function (c) { nameCount[c[0]] = (nameCount[c[0]] || 0) + 1; });


  // Short names used in headlines, so news can be matched to a school.
  var ALIASES = {
    "Louisiana State University and Agricultural & Mechanical College": ["LSU"],
    "University of California-Los Angeles": ["UCLA"],
    "University of Southern California": ["USC"],
    "Brigham Young University": ["BYU"],
    "University of North Carolina at Chapel Hill": ["UNC", "Chapel Hill"],
    "North Carolina State University at Raleigh": ["NC State", "N.C. State"],
    "Ohio State University-Main Campus": ["Ohio State"],
    "Pennsylvania State University-Main Campus": ["Penn State"],
    "Michigan State University": ["Michigan State"],
    "Florida State University": ["Florida State", "FSU"],
    "California State University-San Marcos": ["Cal State San Marcos", "CSU San Marcos", "CSUSM"],
    "University of California-Berkeley": ["UC Berkeley"],
    "University of Michigan-Ann Arbor": ["University of Michigan"],
    "Columbia University in the City of New York": ["Columbia"],
    "Indiana University-Bloomington": ["Indiana University", "IU "],
    "University of Utah": ["University of Utah", "U. of Utah", "U of U"],
    "Texas A&M University-College Station": ["Texas A&M"]
  };
  function newsKeys(name) {
    var keys = (ALIASES[name] || []).slice();
    var base = name.split("-")[0].trim();
    keys.push(base);
    var m = base.match(/^(?:The )?([A-Z][\w.&' ]*?) (?:University|College)$/);
    if (m && m[1].split(" ").length <= 2) keys.push(m[1]); // "Cornell University" -> "Cornell"
    return keys.map(function (k) { return k.toLowerCase(); });
  }
  function newsFor(r) {
    if (!NEWS) return [];
    var keys = newsKeys(r.raw[0]);
    return NEWS.items.filter(function (n) {
      var t = n.t.toLowerCase();
      return keys.some(function (k) { return t.indexOf(k) !== -1; });
    });
  }

  // "Pennsylvania State University-Main Campus" -> "Pennsylvania State University"; add the branch only
  // when the school has several campuses and the branch isn't its main one.
  function displayName(c) {
    var name = c[0].replace(/-Main Campus$/, "");
    var branch = (c[1] || "").trim();
    var city = (c[2] || "").toLowerCase();
    if (nameCount[c[0]] > 1 && branch && !/main|^university park|^ann arbor|endowed/i.test(branch) && branch !== c[0] && c[0].toLowerCase().indexOf(branch.toLowerCase()) === -1 &&
        !(city && branch.toLowerCase().indexOf(city) !== -1 && c[0].toLowerCase().indexOf(city) !== -1)) name += " — " + branch;
    return name;
  }

  var rows = CLERY.campuses.map(function (c, i) {
    var rape = 0, total = 0;
    c[7].forEach(function (v) { rape += v[0]; total += v[0] + v[1] + v[2]; });
    var state = c[3] && c[3] !== "nan" ? c[3] : "";
    return {
      i: i, raw: c,
      name: displayName(c),
      place: [c[2], state].filter(Boolean).join(", "),
      state: state, lat: c[4], lng: c[5], enroll: c[6],
      perYear: c[7], rape: rape, total: total, cases: []
    };
  });

  CASES.forEach(function (k) {
    var parts = (k.clery || "").split("|");
    // Exact branch name wins; otherwise the first branch containing the given text.
    var same = rows.filter(function (r) { return r.raw[0] === parts[0]; });
    var row = same.filter(function (r) { return r.raw[1] === parts[1]; })[0] ||
      same.filter(function (r) { return r.raw[1].indexOf(parts[1] || "") !== -1; })[0];
    if (row) row.cases.push(k);
  });
  rows.forEach(function (r) { r.cases.sort(function (a, b) { return b.reported - a.reported || b.year - a.year; }); });
  var ranked = rows.slice().sort(function (a, b) { return b.total - a.total; });



  // ---- Intro + footer ----
  document.getElementById("footer").innerHTML =
    'Campus numbers: <a href="https://ope.ed.gov/campussafety/" rel="noopener">U.S. Department of Education, Clery Act statistics</a> ' +
    "(rape, fondling, incest and statutory rape reported on campus, non-campus property and adjacent public property). Most assaults are never reported. " +
    "Cases link to their sources. Individuals are named only if convicted in court. " +
    'Need support? RAINN: <a href="tel:18006564673">800-656-4673</a> · <a href="https://rainn.org" rel="noopener">rainn.org</a>';

  // ---- Legal process explainer + stage display ----
  (function renderProcess() {
    var html = '<p class="muted small">A sexual assault case can move on up to four separate tracks at once. They are independent: prosecutors can decline charges while a civil lawsuit continues, and a school can discipline a student who was never charged.</p><div class="tracks">';
    Object.keys(PROCESS).forEach(function (key) {
      var t = PROCESS[key];
      html += '<div class="track-def"><h3>' + esc(t.label) + '</h3><p class="muted small">' + esc(t.who) + "</p><ol>" +
        t.steps.map(function (s) { return "<li><b>" + esc(s[0]) + ".</b> " + esc(s[1]) + "</li>"; }).join("") + "</ol></div>";
    });
    document.getElementById("process-body").innerHTML = html + "</div>";
  })();

  // One-word status for a case, colored by the track it is on (criminal, civil, school, federal).
  var TRACK_CLASS = { criminal: "t-crim", civil: "t-civ", campus: "t-sch", federal: "t-fed" };
  var TRACK_WORD = { criminal: "Criminal", civil: "Civil", campus: "School", federal: "Federal" };
  function primaryTrack(k) {
    var tr = k.tracks || [];
    return tr.filter(function (t) { return t.state === "active"; })[0] || tr[0] || null;
  }
  var STATUS_RULES = [
    [/mistrial/i, "Mistrial"], [/died/i, "Died"], [/retract/i, "Retracted"], [/innocent|charges dropped/i, "Dropped"],
    [/guilty|convict/i, "Convicted"], [/settle|paid out/i, "Settled"], [/dismiss/i, "Dismissed"],
    [/no charges|declin|not indict/i, "Declined"], [/charged|indicted/i, "Charged"],
    [/investigat/i, "Investigating"], [/filed/i, "Filed"], [/fine/i, "Fined"],
    [/expel|suspend|banned|sanction|responsible|disciplin|essay|probation/i, "Disciplined"],
    [/reform|agreement|monitor|violation|policy|ruled/i, "Resolved"]
  ];
  function statusWord(t) {
    if (!t) return "Reported";
    var texts = [t.short || "", (t.short || "") + " " + (t.note || "")];
    for (var n = 0; n < texts.length; n++) {
      for (var i = 0; i < STATUS_RULES.length; i++) if (STATUS_RULES[i][0].test(texts[n])) return STATUS_RULES[i][1];
    }
    return t.state === "active" ? "Active" : "Closed";
  }
  function badge(cls, word) { return '<span class="st ' + cls + '">' + esc(word) + "</span>"; }
  function stepperHTML(t) {
    var P = PROCESS[t.track];
    var steps = P.steps.map(function (s, i) {
      var cls = i < t.step ? "done" : i === t.step ? (t.state === "active" ? "now" : "end") : "todo";
      return '<li class="' + cls + '" title="' + esc(s[1]) + '">' + esc(s[0]) + "</li>";
    }).join("");
    return '<div class="track"><div class="track-h">' + badge(TRACK_CLASS[t.track], TRACK_WORD[t.track]) + " <b>" + esc(statusWord(t)) +
      '</b> <span class="state ' + t.state + '">' + (t.state === "active" ? "● Active" : "Closed") + '</span></div><ol class="stepper">' + steps +
      '</ol><p class="small">' + esc(t.note) + "</p></div>";
  }
  function caseItem(k) {
    var t = primaryTrack(k);
    // Convicted people link to the official U.S. Department of Justice sex offender registry (photos are published there).
    var named = (k.named || []).map(function (p) {
      return "<b>" + esc(p.name) + "</b> — " + esc(p.basis) +
        ' · <a href="https://www.nsopw.gov/search-public-sex-offender-registries" target="_blank" rel="noopener">Look up in the national sex offender registry ↗</a>';
    }).join("<br>");
    return '<details class="item"><summary>' + badge(t ? TRACK_CLASS[t.track] : "t-fed", statusWord(t)) +
      ' <span class="it-title">' + esc(k.title) + '</span> <span class="muted small">' + esc(k.year) + "</span></summary>" +
      '<div class="it-body"><div class="muted small">Incident: ' + esc(k.year) + " · Became public: " + esc(k.reported) + " · " + esc(k.type) + "</div>" +
      "<p>" + esc(k.summary) + "</p>" +
      (k.tracks || []).map(stepperHTML).join("") +
      "<p><b>Current status:</b> " + esc(k.status) + (k.payout ? " · <b>Paid:</b> " + money(k.payout) : "") + "</p>" +
      (named ? "<p><b>Convicted:</b><br>" + named + "</p>" : "") +
      (k.namingNote ? '<p class="muted small">' + esc(k.namingNote) + "</p>" : "") +
      '<p class="src">Sources: ' + k.sources.map(function (s) {
        return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + "</a>";
      }).join(" · ") + '</p><div class="case-news" id="cn-' + esc(k.id) + '"></div></div></details>';
  }
  function logItem(e) {
    var word = (e.disposition || "Reported").split(/[\s\/,-]+/)[0];
    word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    return '<details class="item"><summary>' + badge("t-crim", word) + ' <span class="it-title">' +
      esc(e.nature || (e.offenses || []).join(", ")) + '</span> <span class="muted small">' + esc((e.reported || "").split(" ")[0]) + "</span></summary>" +
      '<div class="it-body"><p class="muted small">Campus police Daily Crime Log entry. Logs never include names.</p><dl>' +
      "<dt>Offense</dt><dd>" + esc((e.offenses || []).join(", ")) + "</dd>" +
      "<dt>Reported</dt><dd>" + esc(e.reported) + "</dd>" +
      (e.occurred ? "<dt>Occurred</dt><dd>" + esc(e.occurred) + "</dd>" : "") +
      "<dt>Location</dt><dd>" + esc(e.location) + "</dd>" +
      "<dt>Status</dt><dd>" + esc(e.disposition || "Not stated") + "</dd>" +
      "<dt>Incident #</dt><dd>" + esc(e.id) + "</dd></dl></div></details>";
  }

  function slug(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80); }
  var firstRow = {};
  rows.forEach(function (r) { if (!(r.raw[0] in firstRow)) firstRow[r.raw[0]] = r; r.logCount = 0; r.newsCount = 0; r.count = r.cases.length; });
  var logIdx = {}, newsIdx = {};
  function recount() {
    Object.keys(firstRow).forEach(function (name) {
      var r = firstRow[name];
      r.logCount = logIdx[slug(name)] || 0;
      r.newsCount = newsIdx[name] || 0;
      r.count = r.cases.length + r.logCount + r.newsCount;
    });
  }
  function byCount(a, b) { return b.count - a.count || b.total - a.total; }

  // ---- State: search results list, or one school's page ----
  var q = document.getElementById("q");
  var shown = 50;
  var current = null;      // row shown on the school page, or null for the results list
  var listScroll = 0;      // scroll position to restore when going back to results

  // ---- Map (bundled state outlines: no tile service or API key) ----
  if (window.L) {
    var css = getComputedStyle(document.documentElement);
    var accent = css.getPropertyValue("--accent").trim();
    var map = L.map("map", { scrollWheelZoom: false, preferCanvas: true, zoomSnap: 0.25, minZoom: 3, maxZoom: 12 });
    if (window.US_STATES) {
      L.geoJSON(window.US_STATES, {
        style: { color: css.getPropertyValue("--map-line").trim(), weight: 1, fillColor: css.getPropertyValue("--map-land").trim(), fillOpacity: 1 },
        interactive: false
      }).addTo(map);
    }
    map.fitBounds([[24.5, -125], [49.5, -66.5]]);
    map.attributionControl.addAttribution("States: US Census Bureau via us-atlas");
    var maxT = ranked.length ? ranked[0].total : 1;
    if (L.heatLayer) {
      L.heatLayer(rows.map(function (r) { return [r.lat, r.lng, Math.min(1, 0.15 + Math.sqrt(r.total / maxT))]; }),
        { radius: 20, blur: 16, maxZoom: 8, minOpacity: 0.3 }).addTo(map);
    }
    var renderer = L.canvas({ padding: 0.3 });
    rows.forEach(function (r) {
      L.circleMarker([r.lat, r.lng], {
        renderer: renderer, radius: 2 + 10 * Math.sqrt(r.total / maxT),
        color: accent, weight: r.cases.length ? 2 : 1, fillColor: accent, fillOpacity: r.cases.length ? 0.8 : 0.35
      }).bindPopup(function () {
        return "<b>" + esc(r.name) + "</b>" + esc(r.place) +
          "<br><b style='display:inline'>" + num(r.count) + "</b> case" + (r.count === 1 ? "" : "s") + " · " + num(r.total) + " federal reports, " + span +
          '<br><a href="#school-' + r.i + '">Open this school ↓</a>';
      }).addTo(map);
    });
  } else {
    document.getElementById("map").innerHTML = '<p style="padding:16px">Map could not load. The full list is below.</p>';
  }

  // ---- Search results: universities, matched by name, place or case details ----
  function matches(text, term) { return text.toLowerCase().indexOf(term) !== -1; }
  function caseText(k) { return [k.school, k.title, k.summary, k.status, k.type, (k.tracks || []).map(function (t) { return t.short + " " + t.note; }).join(" ")].join(" "); }

  function renderList() {
    var term = q.value.trim().toLowerCase();
    var list = (!term ? rows.slice() : rows.filter(function (r) {
      return matches(r.name + " " + r.place + " " + r.raw[0] + " " + r.raw[1], term) || r.state.toLowerCase() === term ||
        r.cases.some(function (k) { return matches(caseText(k), term); });
    })).sort(function (a, b) { return b.total - a.total || b.count - a.count; });
    var head = '<thead><tr><th class="n">#</th><th>University</th><th class="n">Reports<div class="th-sub">' + span + '</div></th><th class="n">Cases &amp; news<div class="th-sub">with details</div></th></tr></thead>';
    var body = list.slice(0, shown).map(function (r, i) {
      return '<tr class="click" data-school="' + r.i + '" tabindex="0">' +
        '<td class="n muted">' + (i + 1) + "</td>" +
        '<td><div class="school">' + esc(r.name) + ' <span class="go">›</span></div>' +
        '<div class="muted small">' + esc(r.place) + "</div></td>" +
        '<td class="n"><b>' + num(r.total) + '</b></td><td class="n">' + (r.count ? num(r.count) : '<span class="muted">0</span>') + "</td></tr>";
    }).join("");
    document.getElementById("rank").innerHTML = head + "<tbody>" + (body || '<tr><td colspan="4" class="muted">No university matches “' + esc(term) + "”.</td></tr>") + "</tbody>";
    var reports = list.reduce(function (a, r) { return a + r.total; }, 0);
    var cases = list.reduce(function (a, r) { return a + r.count; }, 0);
    document.getElementById("count").textContent = num(reports) + " sex offenses reported to the federal government at " + num(list.length) +
      (term ? " matching" : "") + " universities (" + span + "). " + num(cases) + " cases and news reports you can open. Tap a university.";
    document.getElementById("more").hidden = list.length <= shown;
    renderNews(term);
  }

  // ---- One school's page ----
  var renderToken = 0;   // guards async loaders when a school view is re-rendered
  function renderSchool(r) {
    var token = ++renderToken;
    document.getElementById("school").innerHTML =
      '<button type="button" class="back" id="back">← Back to results</button>' +
      '<h2 class="school-h">' + esc(r.name) + "</h2>" +
      '<p class="muted small">' + esc(r.place) + "</p>" +
      '<p class="fed-top"><b>' + num(r.total) + "</b> sex offenses reported, " + span + " (" + num(r.rape) +
      ' rape). Schools report these to the government only as counts, with no names, dates or details.</p>' +
      '<p class="muted small">By year: ' + years.map(function (y, i) { var v = r.perYear[i]; return y + ": " + num(v[0] + v[1] + v[2]); }).join(" · ") +
      ". 2025 figures are expected from the Department of Education in 2027. A 0 can also mean the school filed no report that year.</p>" +
      '<h4 id="case-count">Cases and news reports (' + num(r.count) + ")</h4>" +
      '<p class="legend small">' + badge("t-crim", "Criminal") + " " + badge("t-civ", "Civil") + " " + badge("t-sch", "School") + " " + badge("t-fed", "Federal") + " " + badge("t-news", "News") +
      ' <span class="muted">Tap a case for details.</span></p>' +
      '<div class="items" id="items">' + r.cases.map(caseItem).join("") + "</div>" +
      (r.count ? "" : '<p class="muted" id="no-cases">No public cases or news reports on file for this school yet.</p>') +
      '';
    loadCrimeLog(r, token);
    loadSchoolNews(r, token);
    document.getElementById("back").addEventListener("click", goBack);
  }

  // News coverage for one school: the archive file built weekly for every school, plus this week's feed.
  function newsItem(n) {
    var all = [n].concat(n.more || []);
    var outlets = all.map(function (a) {
      return '<li><a href="' + esc(a.u) + '" target="_blank" rel="noopener">' + esc(a.t) + '</a> <span class="muted small">' + esc(a.s) + " · " + fmtDate(a.d) + "</span></li>";
    }).join("");
    return '<details class="item"><summary>' + badge("t-news", "News") + ' <span class="it-title">' + esc(n.t) +
      (all.length > 1 ? ' <span class="muted small">· ' + all.length + " articles</span>" : "") +
      '</span> <span class="muted small">' + fmtDate(n.d) + "</span></summary>" +
      '<div class="it-body"><p class="muted small">' + (all.length > 1 ? all.length + " outlets covered this story:" : "Covered by:") + '</p><ul class="mini-news">' + outlets +
      '</ul><p class="muted small">Headlines as published by each outlet. Allegations are unproven unless a court has ruled.</p></div></details>';
  }
  // News stories for one school, from the weekly archive (scripts/fetch_school_news.py).
  function loadSchoolNews(r, token) {
    if (firstRow[r.raw[0]] !== r || !r.newsCount) return;
    fetch("data/school-news/" + slug(r.raw[0]) + ".json", { cache: "no-cache" })
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (items) {
        if (current !== r || token !== renderToken || !items.length) return;
        items.sort(function (a, b) { return b.d - a.d; });
        // Stories about a documented case go inside that case; the rest are rows of their own.
        items.filter(function (n) { return n.case; }).forEach(function (n) {
          var box = document.getElementById("cn-" + n.case);
          if (!box) return;
          if (!box.innerHTML) box.innerHTML = "<p><b>News coverage</b></p><ul class=\"mini-news\"></ul>";
          box.querySelector("ul").insertAdjacentHTML("beforeend", [n].concat(n.more || []).map(function (a) {
            return '<li><a href="' + esc(a.u) + '" target="_blank" rel="noopener">' + esc(a.t) + '</a> <span class="muted small">' + esc(a.s) + " · " + fmtDate(a.d) + "</span></li>";
          }).join(""));
        });
        document.getElementById("items").insertAdjacentHTML("beforeend", items.filter(function (n) { return !n.case; }).map(newsItem).join(""));
        updateCount(r);
      }, function () {});
  }
  function updateCount(r) {
    var n = document.querySelectorAll("#items > details").length;
    document.getElementById("case-count").textContent = "Cases and news reports (" + num(n) + ")";
    var none = document.getElementById("no-cases");
    if (none && n) none.hidden = true;
  }

  // Individual reports from the school's Daily Crime Log become case rows (see scripts/fetch_crime_logs.py).
  function loadCrimeLog(r, token) {
    if (firstRow[r.raw[0]] !== r || !r.logCount) return;
    fetch("data/crimelog/" + slug(r.raw[0]) + ".json", { cache: "no-cache" })
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (entries) {
        if (current !== r || token !== renderToken || !entries.length) return;
        document.getElementById("items").insertAdjacentHTML("beforeend", entries.map(logItem).join(""));
        updateCount(r);
      }, function () {});
  }

  function show() {
    var m = location.hash.match(/^#school-(\d+)$/);
    var r = m ? rows[+m[1]] : null;
    var listEls = ["process", "count", "results", "more", "news-section"];
    if (r) {
      if (!current) listScroll = window.scrollY;
      current = r;
      listEls.forEach(function (id) { document.getElementById(id).hidden = true; });
      document.getElementById("school").hidden = false;
      renderSchool(r);
      document.getElementById("controls").scrollIntoView({ block: "start" });
    } else {
      var wasSchool = !!current;
      current = null;
      document.getElementById("school").hidden = true;
      listEls.forEach(function (id) { document.getElementById(id).hidden = false; });
      renderList();
      if (wasSchool) window.scrollTo(0, listScroll);
    }
  }
  function goBack() {
    // Return to the search results the user came from (browser history when possible).
    if (history.state && history.state.fromList) history.back();
    else { history.replaceState(null, "", location.pathname + location.search); show(); }
  }
  function openSchool(i) {
    history.pushState({ fromList: true }, "", "#school-" + i);
    show();
  }
  window.addEventListener("popstate", show);
  window.addEventListener("hashchange", show);

  var table = document.getElementById("rank");
  table.addEventListener("click", function (e) {
    var tr = e.target.closest("[data-school]");
    if (tr && !e.target.closest("a")) openSchool(+tr.getAttribute("data-school"));
  });
  table.addEventListener("keydown", function (e) {
    var tr = e.target.closest("[data-school]");
    if (tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openSchool(+tr.getAttribute("data-school")); }
  });

  // ---- Latest news (refreshed every 6 hours by a GitHub Action) ----
  var newsShown = 15;
  function renderNews(term) {
    if (!NEWS) { document.getElementById("news-section").hidden = true; return; }
    var list = !term ? NEWS.items : NEWS.items.filter(function (n) { return matches(n.t + " " + n.s, term); });
    document.getElementById("news").innerHTML = list.slice(0, newsShown).map(function (n) {
      return '<li><a href="' + esc(n.u) + '" target="_blank" rel="noopener">' + esc(n.t) + '</a><div class="muted small">' + esc(n.s) + " · " + fmtDate(n.d) + "</div></li>";
    }).join("") || '<li class="muted">No recent news matches “' + esc(term) + "”.</li>";
    document.getElementById("news-meta").textContent = "Headlines as published by each outlet; allegations in them are unproven unless a court has ruled. Updated " +
      new Date(NEWS.updated * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + ".";
    document.getElementById("news-more").hidden = list.length <= newsShown;
  }

  q.addEventListener("input", function () {
    shown = 50; newsShown = 15;
    if (current) { history.replaceState(null, "", location.pathname + location.search); show(); } else renderList();
  });
  document.getElementById("more").addEventListener("click", function () { shown += 100; renderList(); });
  document.getElementById("news-more").addEventListener("click", function () { newsShown += 20; renderNews(q.value.trim().toLowerCase()); });
  show();
  fetch("data/crimelog/index.json", { cache: "no-cache" })
    .then(function (res) { return res.ok ? res.json() : {}; })
    .then(function (idx) { logIdx = idx || {}; recount(); show(); }, function () {});
  fetch("data/school-news/index.json", { cache: "no-cache" })
    .then(function (res) { return res.ok ? res.json() : {}; })
    .then(function (idx) { newsIdx = idx || {}; recount(); show(); }, function () {});
})();
