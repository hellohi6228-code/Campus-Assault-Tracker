(function () {
  "use strict";

  var CLERY = window.CLERY || { campuses: [], recentYears: [], years: [], national: {} };
  var CASES = window.CASES || [];
  var PROCESS = window.PROCESS || {};

  var STATUS_LABELS = {
    "conviction": "Criminal conviction",
    "settled": "Settled",
    "pending": "Lawsuit pending",
    "federal": "Federal finding",
    "no-charges": "No charges filed",
    "discredited": "Discredited"
  };

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

  // ---- Build one row per campus ----
  var years = CLERY.recentYears;
  var span = years.length ? years[0] + "–" + years[years.length - 1] : "";
  var nameCount = {};
  CLERY.campuses.forEach(function (c) { nameCount[c[0]] = (nameCount[c[0]] || 0) + 1; });

  var rows = CLERY.campuses.map(function (c, i) {
    var rape = 0, total = 0;
    c[7].forEach(function (v) { rape += v[0]; total += v[0] + v[1] + v[2]; });
    var state = c[3] && c[3] !== "nan" ? c[3] : "";
    return {
      i: i, raw: c,
      name: c[0] + (nameCount[c[0]] > 1 && c[1] ? " — " + c[1] : ""),
      place: [c[2], state].filter(Boolean).join(", "),
      state: state, lat: c[4], lng: c[5], enroll: c[6],
      perYear: c[7].map(function (v) { return v[0] + v[1] + v[2]; }),
      rape: rape, total: total,
      rate: c[6] >= 1000 ? (total / years.length) / c[6] * 10000 : null,
      cases: []
    };
  });

  // Attach documented lawsuits/investigations to their campus row.
  CASES.forEach(function (k) {
    var parts = (k.clery || "").split("|");
    var row = rows.filter(function (r) { return r.raw[0] === parts[0] && r.raw[1].indexOf(parts[1] || "") !== -1; })[0];
    if (row) row.cases.push(k);
  });

  var byTotal = rows.slice().sort(function (a, b) { return b.total - a.total; });
  byTotal.forEach(function (r, i) { r.rankTotal = i + 1; });
  var byRate = rows.filter(function (r) { return r.rate != null && r.enroll >= 5000; })
    .sort(function (a, b) { return b.rate - a.rate; });
  byRate.forEach(function (r, i) { r.rankRate = i + 1; });

  // ---- Intro + footer ----
  var ly = CLERY.years[CLERY.years.length - 1];
  if (ly) {
    var n = CLERY.national[ly];
    document.getElementById("lede").textContent =
      num(n.rape + n.fondling + n.incest + n.statutory) + " sex offenses, including " + num(n.rape) +
      " rapes, were reported on US college campuses in " + ly + ". Here is every campus with a report in " + span + ".";
  }
  document.getElementById("footer").innerHTML =
    'Data: <a href="https://ope.ed.gov/campussafety/" rel="noopener">U.S. Department of Education, Clery Act campus crime statistics</a> ' +
    "(rape, fondling, incest and statutory rape reported on campus, on non-campus property and on adjacent public property). These are reported offenses only; most assaults are never reported. " +
    "Lawsuits and investigations link to their sources. Individuals are named only if convicted in court. " +
    'Need support? RAINN: <a href="tel:18006564673">800-656-4673</a> · <a href="https://rainn.org" rel="noopener">rainn.org</a>';

  // ---- Map (no tile service: state outlines are bundled, so no API key is ever needed) ----
  var map = null;
  if (window.L) {
    var css = getComputedStyle(document.documentElement);
    var accent = css.getPropertyValue("--accent").trim();
    map = L.map("map", { scrollWheelZoom: false, preferCanvas: true, zoomSnap: 0.25, minZoom: 3, maxZoom: 12 });
    if (window.US_STATES) {
      L.geoJSON(window.US_STATES, {
        style: { color: css.getPropertyValue("--map-line").trim(), weight: 1, fillColor: css.getPropertyValue("--map-land").trim(), fillOpacity: 1 },
        interactive: false
      }).addTo(map);
    }
    map.fitBounds([[24.5, -125], [49.5, -66.5]]);
    map.attributionControl.addAttribution("States: US Census Bureau via us-atlas");

    var maxT = byTotal.length ? byTotal[0].total : 1;
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
          "<br><b style='display:inline'>" + num(r.total) + "</b> reported sex offenses, " + span + " (" + num(r.rape) + " rape)" +
          "<br>Rank #" + r.rankTotal + " of " + num(rows.length) +
          (r.cases.length ? "<br><b style='display:inline'>" + r.cases.map(function (k) { var t = primaryTrack(k); return esc(t ? stageLabel(t) : k.status); }).join("<br>") + "</b>" : "") +
          '<br><a href="#" data-show="' + r.i + '">Show in list ↓</a>';
      }).addTo(map);
    });
    map.on("popupopen", function (e) {
      var a = e.popup.getElement().querySelector("[data-show]");
      if (a) a.addEventListener("click", function (ev) {
        ev.preventDefault();
        var r = rows[+a.getAttribute("data-show")];
        q.value = r.raw[0];
        open[r.i] = true;
        shown = 50; render();
        var tr = document.getElementById("row-" + r.i);
        if (tr) tr.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  } else {
    document.getElementById("map").innerHTML = '<p style="padding:16px">Map could not load. The full list is below.</p>';
  }

  // ---- Search + ranked table ----
  var q = document.getElementById("q");
  var sortKey = "total";
  var shown = 50;
  var open = {};

  (function renderProcess() {
    var html = '<p class="muted small">A case can move on up to four separate tracks at once. They are independent: prosecutors can decline charges while a civil lawsuit continues.</p><div class="tracks">';
    Object.keys(PROCESS).forEach(function (key) {
      var t = PROCESS[key];
      html += '<div class="track-def"><h3>' + esc(t.label) + '</h3><p class="muted small">' + esc(t.who) + "</p><ol>" +
        t.steps.map(function (s) { return "<li><b>" + esc(s[0]) + ".</b> " + esc(s[1]) + "</li>"; }).join("") + "</ol></div>";
    });
    document.getElementById("process-body").innerHTML = html + "</div>";
  })();

  // The track to summarize on the row: the first still-active track, else the first listed.
  function primaryTrack(k) {
    var tr = k.tracks || [];
    return tr.filter(function (t) { return t.state === "active"; })[0] || tr[0];
  }
  function stageLabel(t) {
    var P = PROCESS[t.track];
    return P.label.replace(/ \(.*\)/, "") + ": " + (t.short || P.steps[t.step][0]);
  }
  function stepperHTML(t) {
    var P = PROCESS[t.track];
    var steps = P.steps.map(function (s, i) {
      var cls = i < t.step ? "done" : i === t.step ? (t.state === "active" ? "now" : "end") : "todo";
      return '<li class="' + cls + '" title="' + esc(s[1]) + '">' + esc(s[0]) + "</li>";
    }).join("");
    return '<div class="track"><div class="track-h"><b>' + esc(P.label) + '</b> <span class="state ' + t.state + '">' +
      (t.state === "active" ? "● Active" : "Closed") + "</span> — " + esc(t.short || "") + '</div><ol class="stepper">' + steps + '</ol><p class="small">' + esc(t.note) + "</p></div>";
  }

  function caseHTML(k) {
    var named = (k.named || []).map(function (p) { return "<b>" + esc(p.name) + "</b> — " + esc(p.basis); }).join("<br>");
    return '<div class="case"><div class="case-h"><span class="badge b-' + esc(k.statusCategory) + '">' + esc(STATUS_LABELS[k.statusCategory]) + "</span> " +
      "<b>" + esc(k.title) + "</b> <span class=\"muted\">(" + esc(k.year) + ")</span></div>" +
      "<p>" + esc(k.summary) + "</p>" +
      (k.tracks || []).map(stepperHTML).join("") +
      "<p><b>Status:</b> " + esc(k.status) + (k.payout ? " · <b>Paid:</b> " + money(k.payout) : "") + "</p>" +
      (named ? "<p>" + named + "</p>" : "") +
      (k.namingNote ? '<p class="muted">' + esc(k.namingNote) + "</p>" : "") +
      '<p class="src">Sources: ' + k.sources.map(function (s) {
        return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + "</a>";
      }).join(" · ") + "</p></div>";
  }

  function render() {
    var term = q.value.trim().toLowerCase();
    var base = sortKey === "rate" ? byRate : byTotal;
    var list = !term ? base : base.filter(function (r) {
      return (r.name + " " + r.place).toLowerCase().indexOf(term) !== -1 || r.state.toLowerCase() === term;
    });

    var head = '<thead><tr><th class="n">#</th><th>School</th>' +
      years.map(function (y) { return '<th class="n opt">' + y + "</th>"; }).join("") +
      '<th class="n">Total</th><th class="n">Rape</th><th class="n opt">Per 10k</th></tr></thead>';
    var cols = 6 + years.length;
    var body = list.slice(0, shown).map(function (r) {
      var rank = sortKey === "rate" ? r.rankRate : r.rankTotal;
      var flag = r.cases.map(function (k) {
        var t = primaryTrack(k);
        var active = (k.tracks || []).some(function (x) { return x.state === "active"; });
        return ' <button type="button" class="flag' + (active ? " live" : "") + '" data-toggle="' + r.i + '">' +
          esc(t ? stageLabel(t) : STATUS_LABELS[k.statusCategory]) + (open[r.i] ? " ▲" : " ▼") + "</button>";
      }).join("");
      var tr = '<tr id="row-' + r.i + '"><td class="n muted">' + rank + "</td>" +
        "<td><div class=\"school\">" + esc(r.name) + flag + '</div><div class="muted small">' + esc(r.place) + "</div></td>" +
        r.perYear.map(function (v) { return '<td class="n opt">' + num(v) + "</td>"; }).join("") +
        '<td class="n"><b>' + num(r.total) + '</b></td><td class="n">' + num(r.rape) + '</td><td class="n opt">' + (r.rate == null ? "—" : r.rate.toFixed(1)) + "</td></tr>";
      if (r.cases.length && open[r.i]) tr += '<tr class="detail"><td colspan="' + cols + '">' + r.cases.map(caseHTML).join("") + "</td></tr>";
      return tr;
    }).join("");

    document.getElementById("rank").innerHTML = head + "<tbody>" + (body || '<tr><td colspan="' + cols + '" class="muted">No school matches “' + esc(term) +
      "”. Schools not listed reported zero sex offenses in " + span + ".</td></tr>") + "</tbody>";
    document.getElementById("count").textContent = (term ? num(list.length) + " matching" : num(list.length)) +
      (sortKey === "rate" ? " campuses with 5,000+ students, ranked by reports per 10,000 students per year" : " campuses, ranked by total reported sex offenses") +
      " · " + span;
    document.getElementById("more").hidden = list.length <= shown;
  }

  // ---- News feed (data/news.js, refreshed every 6 hours by a GitHub Action) ----
  var NEWS = window.NEWS || null;
  var newsShown = 15;
  function renderNews() {
    var ul = document.getElementById("news");
    if (!NEWS) { document.querySelector(".news").hidden = true; return; }
    var term = q.value.trim().toLowerCase();
    var list = !term ? NEWS.items : NEWS.items.filter(function (n) { return (n.t + " " + n.s).toLowerCase().indexOf(term) !== -1; });
    ul.innerHTML = list.slice(0, newsShown).map(function (n) {
      var d = new Date(n.d * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return '<li><a href="' + esc(n.u) + '" target="_blank" rel="noopener">' + esc(n.t) + '</a><div class="muted small">' + esc(n.s) + " · " + d + "</div></li>";
    }).join("") || '<li class="muted">No recent news matches “' + esc(term) + "”.</li>";
    document.getElementById("news-meta").textContent = "Headlines as published by each outlet; allegations in them are unproven unless a court has ruled. Updated " +
      new Date(NEWS.updated * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + ".";
    document.getElementById("news-more").hidden = list.length <= newsShown;
  }
  document.getElementById("news-more").addEventListener("click", function () { newsShown += 20; renderNews(); });

  q.addEventListener("input", function () { shown = 50; newsShown = 15; render(); renderNews(); });
  document.getElementById("more").addEventListener("click", function () { shown += 100; render(); });
  document.getElementById("rank").addEventListener("click", function (e) {
    var b = e.target.closest("[data-toggle]");
    if (!b) return;
    var i = +b.getAttribute("data-toggle");
    open[i] = !open[i];
    render();
  });
  document.querySelectorAll("[data-sort]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("[data-sort]").forEach(function (x) { x.classList.toggle("on", x === b); });
      sortKey = b.getAttribute("data-sort"); shown = 50; render();
    });
  });
  render();
  renderNews();
})();
