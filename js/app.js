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
    "Columbia University in the City of New York": ["Columbia"]
  };
  function newsKeys(name) {
    var keys = (ALIASES[name] || []).slice();
    var base = name.split("-")[0].trim();
    keys.push(base);
    var m = base.match(/^(?:The )?([A-Z][\w.&' ]*?) (?:University|College)$/);
    if (m && m[1].split(" ").length <= 2) keys.push(m[1]); // "Cornell University" -> "Cornell"
    return keys.map(function (k) { return k.toLowerCase(); });
  }

  var rows = CLERY.campuses.map(function (c, i) {
    var rape = 0, total = 0;
    c[7].forEach(function (v) { rape += v[0]; total += v[0] + v[1] + v[2]; });
    var state = c[3] && c[3] !== "nan" ? c[3] : "";
    return {
      i: i, raw: c,
      name: c[0] + (nameCount[c[0]] > 1 && c[1] ? " — " + c[1] : ""),
      place: [c[2], state].filter(Boolean).join(", "),
      state: state, lat: c[4], lng: c[5], enroll: c[6],
      perYear: c[7], rape: rape, total: total, cases: [], keys: newsKeys(c[0])
    };
  });

  CASES.forEach(function (k) {
    var parts = (k.clery || "").split("|");
    var row = rows.filter(function (r) { return r.raw[0] === parts[0] && r.raw[1].indexOf(parts[1] || "") !== -1; })[0];
    if (row) row.cases.push(k);
  });
  rows.forEach(function (r) { r.cases.sort(function (a, b) { return b.reported - a.reported || b.year - a.year; }); });
  var ranked = rows.slice().sort(function (a, b) { return b.total - a.total; });
  ranked.forEach(function (r, i) { r.rank = i + 1; });

  function newsFor(r) {
    if (!NEWS) return [];
    return NEWS.items.filter(function (n) {
      var t = n.t.toLowerCase();
      return r.keys.some(function (k) { return t.indexOf(k) !== -1; });
    });
  }

  // ---- Intro + footer ----
  var ly = CLERY.years[CLERY.years.length - 1];
  if (ly) {
    var nat = CLERY.national[ly];
    document.getElementById("lede").textContent =
      num(nat.rape + nat.fondling + nat.incest + nat.statutory) + " sex offenses, including " + num(nat.rape) +
      " rapes, were reported on US college campuses in " + ly + ". Search any school to see its numbers, its cases and where each case is in the legal process.";
  }
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

  function trackName(t) { return PROCESS[t.track].label.replace(/ \(.*\)/, ""); }
  function stageChip(t) {
    return '<span class="chip ' + (t.state === "active" ? "live" : "") + '">' + esc(trackName(t)) + ": " + esc(t.short || PROCESS[t.track].steps[t.step][0]) + "</span>";
  }
  function stepperHTML(t) {
    var P = PROCESS[t.track];
    var steps = P.steps.map(function (s, i) {
      var cls = i < t.step ? "done" : i === t.step ? (t.state === "active" ? "now" : "end") : "todo";
      return '<li class="' + cls + '" title="' + esc(s[1]) + '">' + esc(s[0]) + "</li>";
    }).join("");
    return '<div class="track"><div class="track-h"><b>' + esc(P.label) + '</b> <span class="state ' + t.state + '">' +
      (t.state === "active" ? "● Active" : "Closed") + "</span> — " + esc(t.short || "") + '</div><ol class="stepper">' + steps +
      '</ol><p class="small">' + esc(t.note) + "</p></div>";
  }
  function caseHTML(k) {
    var named = (k.named || []).map(function (p) { return "<b>" + esc(p.name) + "</b> — " + esc(p.basis); }).join("<br>");
    return '<div class="case"><div class="case-h"><b>' + esc(k.title) + "</b></div>" +
      '<div class="muted small">Incident: ' + esc(k.year) + " · Became public: " + esc(k.reported) + " · " + esc(k.type) + "</div>" +
      "<p>" + esc(k.summary) + "</p>" +
      (k.tracks || []).map(stepperHTML).join("") +
      "<p><b>Current status:</b> " + esc(k.status) + (k.payout ? " · <b>Paid:</b> " + money(k.payout) : "") + "</p>" +
      (named ? "<p><b>Convicted:</b><br>" + named + "</p>" : "") +
      (k.namingNote ? '<p class="muted small">' + esc(k.namingNote) + "</p>" : "") +
      '<p class="src">Sources: ' + k.sources.map(function (s) {
        return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + "</a>";
      }).join(" · ") + "</p></div>";
  }
  function newsListHTML(list, limit) {
    return '<ul class="mini-news">' + list.slice(0, limit).map(function (n) {
      return '<li><a href="' + esc(n.u) + '" target="_blank" rel="noopener">' + esc(n.t) + '</a> <span class="muted small">' + esc(n.s) + " · " + fmtDate(n.d) + "</span></li>";
    }).join("") + "</ul>";
  }
  function schoolDetailHTML(r) {
    var yrs = '<table class="yrs"><thead><tr><th></th>' + years.map(function (y) { return '<th class="n">' + y + "</th>"; }).join("") +
      "</tr></thead><tbody>" +
      [["Rape", 0], ["Fondling", 1], ["Incest / statutory rape", 2]].map(function (x) {
        return "<tr><td>" + x[0] + "</td>" + r.perYear.map(function (v) { return '<td class="n">' + num(v[x[1]]) + "</td>"; }).join("") + "</tr>";
      }).join("") +
      '<tr class="tot"><td>Total reported</td>' + r.perYear.map(function (v) { return '<td class="n">' + num(v[0] + v[1] + v[2]) + "</td>"; }).join("") + "</tr></tbody></table>";
    var html = "<h4>Reported to the federal government</h4>" + yrs +
      '<p class="muted small">Clery Act counts are anonymous; individual reports are not published.</p>';
    html += "<h4>Documented cases (" + r.cases.length + ")</h4>" +
      (r.cases.length ? r.cases.map(caseHTML).join("") : '<p class="muted small">No documented lawsuit, charge or investigation in this database yet.</p>');
    var news = newsFor(r);
    if (news.length) html += "<h4>Recent news (" + news.length + ")</h4>" + newsListHTML(news, 10);
    return html;
  }

  // ---- Map (bundled state outlines: no tile service or API key) ----
  var q = document.getElementById("q");
  var view = "schools";
  var shown = 50;
  var open = {};

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
          "<br><b style='display:inline'>" + num(r.total) + "</b> reported sex offenses, " + span + " (" + num(r.rape) + " rape) · rank #" + r.rank +
          (r.cases.length ? "<br>" + r.cases.length + " documented case" + (r.cases.length > 1 ? "s" : "") : "") +
          '<br><a href="#" data-show="' + r.i + '">Open school details ↓</a>';
      }).addTo(map);
    });
    map.on("popupopen", function (e) {
      var a = e.popup.getElement().querySelector("[data-show]");
      if (a) a.addEventListener("click", function (ev) {
        ev.preventDefault();
        var r = rows[+a.getAttribute("data-show")];
        setView("schools");
        q.value = r.raw[0];
        open["s" + r.i] = true;
        shown = 50; render();
        var tr = document.getElementById("row-" + r.i);
        if (tr) tr.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  } else {
    document.getElementById("map").innerHTML = '<p style="padding:16px">Map could not load. The full list is below.</p>';
  }

  // ---- Table: universities view and all-cases view ----
  function matches(text, term) { return text.toLowerCase().indexOf(term) !== -1; }

  function renderSchools(term) {
    var list = !term ? ranked : ranked.filter(function (r) {
      return matches(r.name + " " + r.place, term) || r.state.toLowerCase() === term ||
        r.cases.some(function (k) { return matches(k.school + " " + k.title, term); });
    });
    var head = '<thead><tr><th class="n">#</th><th>University</th>' +
      years.map(function (y) { return '<th class="n opt">' + y + "</th>"; }).join("") +
      '<th class="n">Total reports</th><th class="n">Rape</th></tr></thead>';
    var cols = 4 + years.length;
    var body = list.slice(0, shown).map(function (r) {
      var isOpen = !!open["s" + r.i];
      var chips = r.cases.map(function (k) {
        var t = (k.tracks || []).filter(function (x) { return x.state === "active"; })[0] || (k.tracks || [])[0];
        return t ? stageChip(t) : "";
      }).join(" ");
      var tr = '<tr id="row-' + r.i + '" class="click' + (isOpen ? " open" : "") + '" data-open="s' + r.i + '" tabindex="0" aria-expanded="' + isOpen + '">' +
        '<td class="n muted">' + r.rank + "</td>" +
        '<td><div class="school"><span class="caret">' + (isOpen ? "▾" : "▸") + "</span> " + esc(r.name) + "</div>" +
        '<div class="muted small">' + esc(r.place) + (r.cases.length ? " · " + r.cases.length + " documented case" + (r.cases.length > 1 ? "s" : "") : "") + "</div>" +
        (chips ? '<div class="chips">' + chips + "</div>" : "") + "</td>" +
        r.perYear.map(function (v) { return '<td class="n opt">' + num(v[0] + v[1] + v[2]) + "</td>"; }).join("") +
        '<td class="n"><b>' + num(r.total) + '</b></td><td class="n">' + num(r.rape) + "</td></tr>";
      if (isOpen) tr += '<tr class="detail"><td colspan="' + cols + '">' + schoolDetailHTML(r) + "</td></tr>";
      return tr;
    }).join("");
    document.getElementById("rank").innerHTML = head + "<tbody>" + (body || '<tr><td colspan="' + cols + '" class="muted">No university matches “' + esc(term) +
      "”. Schools not listed reported zero sex offenses in " + span + ".</td></tr>") + "</tbody>";
    document.getElementById("count").textContent = (term ? num(list.length) + " matching universities" : num(list.length) + " universities") +
      ", ranked by total reported sex offenses, " + span + ". Click a university for its full record.";
    document.getElementById("more").hidden = list.length <= shown;
  }

  var casesSorted = CASES.slice().sort(function (a, b) { return b.reported - a.reported || b.year - a.year; });
  function renderCases(term) {
    var list = !term ? casesSorted : casesSorted.filter(function (k) {
      return matches([k.school, k.city, k.state, k.title, k.summary, k.status, k.type].join(" "), term) || k.state.toLowerCase() === term;
    });
    var head = '<thead><tr><th class="n">Year</th><th>University</th><th class="opt">Case</th><th class="opt">Where it is in the legal process</th></tr></thead>';
    var body = list.map(function (k) {
      var id = "c" + CASES.indexOf(k);
      var isOpen = !!open[id];
      var tr = '<tr class="click' + (isOpen ? " open" : "") + '" data-open="' + id + '" tabindex="0" aria-expanded="' + isOpen + '">' +
        '<td class="n muted">' + esc(k.reported) + "</td>" +
        '<td><div class="school"><span class="caret">' + (isOpen ? "▾" : "▸") + "</span> " + esc(k.school) + '</div><div class="muted small">' + esc(k.city) + ", " + esc(k.state) + "</div>" +
        '<div class="mobile-only"><div class="small">' + esc(k.title) + '</div><div class="chips">' + (k.tracks || []).map(stageChip).join(" ") + "</div></div></td>" +
        '<td class="case-title opt">' + esc(k.title) + "</td>" +
        '<td class="opt"><div class="chips">' + (k.tracks || []).map(stageChip).join(" ") + "</div></td></tr>";
      if (isOpen) tr += '<tr class="detail"><td colspan="4">' + caseHTML(k) + "</td></tr>";
      return tr;
    }).join("");
    document.getElementById("rank").innerHTML = head + "<tbody>" + (body || '<tr><td colspan="4" class="muted">No case matches “' + esc(term) + "”.</td></tr>") + "</tbody>";
    var live = list.filter(function (k) { return (k.tracks || []).some(function (t) { return t.state === "active"; }); }).length;
    document.getElementById("count").textContent = num(list.length) + (term ? " matching" : "") + " documented cases, newest first · " + live +
      " still active. Click a case for the full record.";
    document.getElementById("more").hidden = true;
  }

  function render() {
    var term = q.value.trim().toLowerCase();
    document.getElementById("rank").className = "rank " + view;
    if (view === "cases") renderCases(term); else renderSchools(term);
    renderNews(term);
  }

  // ---- Latest news (refreshed every 6 hours by a GitHub Action) ----
  var newsShown = 15;
  function renderNews(term) {
    if (!NEWS) { document.querySelector(".news").hidden = true; return; }
    var list = !term ? NEWS.items : NEWS.items.filter(function (n) { return matches(n.t + " " + n.s, term); });
    document.getElementById("news").innerHTML = list.slice(0, newsShown).map(function (n) {
      return '<li><a href="' + esc(n.u) + '" target="_blank" rel="noopener">' + esc(n.t) + '</a><div class="muted small">' + esc(n.s) + " · " + fmtDate(n.d) + "</div></li>";
    }).join("") || '<li class="muted">No recent news matches “' + esc(term) + "”.</li>";
    document.getElementById("news-meta").textContent = "Headlines as published by each outlet; allegations in them are unproven unless a court has ruled. Updated " +
      new Date(NEWS.updated * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + ".";
    document.getElementById("news-more").hidden = list.length <= newsShown;
  }

  function setView(v) {
    view = v;
    document.querySelectorAll("[data-view]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-view") === v); });
  }
  document.querySelectorAll("[data-view]").forEach(function (b) {
    b.addEventListener("click", function () { setView(b.getAttribute("data-view")); shown = 50; render(); });
  });
  document.querySelector('[data-view="cases"]').textContent = "All cases (" + CASES.length + ")";

  function toggleRow(e) {
    if (e.target.closest("a")) return;
    var tr = e.target.closest("[data-open]");
    if (!tr) return;
    var id = tr.getAttribute("data-open");
    open[id] = !open[id];
    render();
  }
  var table = document.getElementById("rank");
  table.addEventListener("click", toggleRow);
  table.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleRow(e); } });

  q.addEventListener("input", function () {
    shown = 50; newsShown = 15;
    render();
    // Auto-open the top result when a search narrows to a handful of universities.
    var term = q.value.trim().toLowerCase();
    if (view === "schools" && term.length > 2) {
      var hits = ranked.filter(function (r) { return matches(r.name + " " + r.place, term) || r.cases.some(function (k) { return matches(k.school, term); }); });
      if (hits.length && hits.length <= 5 && !open["s" + hits[0].i]) {
        open["s" + hits[0].i] = true; render();
      }
    }
  });
  document.getElementById("more").addEventListener("click", function () { shown += 100; render(); });
  document.getElementById("news-more").addEventListener("click", function () { newsShown += 20; renderNews(q.value.trim().toLowerCase()); });
  render();
})();
