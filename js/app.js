(function () {
  "use strict";

  var CASES = window.CASES || [];
  var CLERY = window.CLERY || null;

  var STATUS_LABELS = {
    "conviction": "Criminal conviction",
    "settled": "Settled",
    "pending": "Pending",
    "federal": "Federal finding / reform",
    "no-charges": "No charges",
    "discredited": "Discredited"
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) {
    if (!n) return "—";
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K";
    return "$" + n;
  }
  function num(n) { return n == null ? "n/a" : Number(n).toLocaleString("en-US"); }
  function toggleGroup(attr, onPick) {
    var btns = document.querySelectorAll("[" + attr + "]");
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        btns.forEach(function (x) { x.classList.toggle("on", x === b); });
        onPick(b.getAttribute(attr));
      });
    });
  }

  // ---- Federal (Clery) campus data ----
  // campus row: [name, branch, city, state, lat, lng, enrollment, [[rape, fondling, other] per recent year]]
  var campuses = [];
  var recentYears = [];
  if (CLERY) {
    recentYears = CLERY.recentYears;
    campuses = CLERY.campuses.map(function (c) {
      var rape = 0, fondl = 0, other = 0;
      c[7].forEach(function (v) { rape += v[0]; fondl += v[1]; other += v[2]; });
      var label = c[0] + (c[1] && !/^main campus$/i.test(c[1]) ? " — " + c[1] : "");
      return {
        name: label, city: c[2], state: c[3], lat: c[4], lng: c[5], enroll: c[6],
        years: c[7], rape: rape, fondl: fondl, other: other, total: rape + fondl + other
      };
    });
  }
  var span = recentYears.length ? recentYears[0] + "–" + recentYears[recentYears.length - 1] : "";

  // ---- Header stats ----
  var real = CASES.filter(function (c) { return c.statusCategory !== "discredited"; });
  var totalPayout = real.reduce(function (a, c) { return a + (c.payout || 0); }, 0);
  var stats = [];
  if (CLERY) {
    var ly = CLERY.years[CLERY.years.length - 1];
    var n = CLERY.national[ly];
    var allYears = CLERY.years.reduce(function (a, y) {
      var v = CLERY.national[y]; return a + v.rape + v.fondling + v.incest + v.statutory;
    }, 0);
    stats.push([num(n.rape + n.fondling + n.incest + n.statutory), "sex offenses reported on campuses in " + ly]);
    stats.push([num(n.rape), "rapes reported in " + ly]);
    stats.push([num(allYears), "sex offenses reported " + CLERY.years[0] + "–" + ly]);
    stats.push([num(campuses.length), "campuses with reports, " + span]);
  }
  stats.push([real.length, "major cases tracked"]);
  stats.push([money(totalPayout), "paid in settlements & fines"]);
  document.getElementById("stats").innerHTML = stats.map(function (s) {
    return '<div class="stat"><b>' + s[0] + "</b><span>" + esc(s[1]) + "</span></div>";
  }).join("");

  // ---- Map ----
  var mapCaption = document.getElementById("map-caption");
  if (window.L) initMap();
  else document.getElementById("map").innerHTML = '<p style="padding:16px">Map could not load. The rankings, school lookup and case list below are complete.</p>';

  function initMap() {
    var map = L.map("map", { scrollWheelZoom: false, preferCanvas: true }).setView([39.5, -97], 4);
    var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    L.tileLayer("https://{s}.basemaps.cartocdn.com/" + (dark ? "dark_all" : "light_all") + "/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 18
    }).addTo(map);

    var css = getComputedStyle(document.documentElement);
    var accent = css.getPropertyValue("--accent").trim() || "#b3261e";

    // Layer 1: every campus, weighted by reported sex offenses.
    var cleryLayer = L.layerGroup();
    if (campuses.length) {
      var maxT = campuses[0].total;
      var heatOpts = { radius: 22, blur: 18, maxZoom: 9, minOpacity: 0.3 };
      if (L.heatLayer) {
        cleryLayer.addLayer(L.heatLayer(campuses.map(function (c) {
          return [c.lat, c.lng, Math.min(1, 0.15 + Math.sqrt(c.total / maxT))];
        }), heatOpts));
      }
      var renderer = L.canvas({ padding: 0.3 });
      campuses.forEach(function (c) {
        L.circleMarker([c.lat, c.lng], {
          renderer: renderer, radius: 2 + 10 * Math.sqrt(c.total / maxT),
          color: accent, weight: 1, fillColor: accent, fillOpacity: 0.35
        }).bindPopup(
          "<b>" + esc(c.name) + "</b>" + esc(c.city) + ", " + esc(c.state) +
          "<br>" + span + ": <b style='display:inline'>" + num(c.total) + "</b> reported sex offenses" +
          "<br><small>" + num(c.rape) + " rape · " + num(c.fondl) + " fondling · " + num(c.other) + " incest/statutory" +
          (c.enroll ? " · " + num(c.enroll) + " students" : "") + "</small>"
        ).addTo(cleryLayer);
      });
    }

    // Layer 2: major documented cases.
    var casesLayer = L.layerGroup();
    CASES.forEach(function (c) {
      var col = css.getPropertyValue("--c-" + c.statusCategory).trim() || accent;
      L.circleMarker([c.lat, c.lng], { radius: 7, color: "#fff", weight: 1.5, fillColor: col, fillOpacity: 1 })
        .bindPopup(
          "<b>" + esc(c.school) + "</b>" + esc(c.title) +
          "<br><small>" + esc(STATUS_LABELS[c.statusCategory]) + " · " + esc(c.status) + "</small>" +
          '<br><a href="#case-' + esc(c.id) + '">Full case &amp; sources ↓</a>'
        ).addTo(casesLayer);
    });

    var captions = {
      clery: "Every campus that reported at least one rape, fondling, incest or statutory-rape offense to the Department of Education, " + span +
        ". Dot size shows the number of reports. Click a dot for the numbers.",
      cases: "Major scandals, colored by current status. Click a dot for details and sources."
    };
    function show(which) {
      [cleryLayer, casesLayer].forEach(function (l) { map.removeLayer(l); });
      (which === "cases" || !campuses.length ? casesLayer : cleryLayer).addTo(map);
      mapCaption.textContent = captions[which === "cases" || !campuses.length ? "cases" : "clery"];
    }
    toggleGroup("data-layer", show);
    show("clery");
  }

  // ---- National trend (inline SVG bar chart) ----
  (function renderTrend() {
    var el = document.getElementById("trend");
    if (!CLERY) { el.closest("section").hidden = true; return; }
    var ys = CLERY.years;
    var rows = ys.map(function (y) {
      var v = CLERY.national[y];
      return { y: y, rape: v.rape, other: v.fondling + v.incest + v.statutory };
    });
    var max = Math.max.apply(null, rows.map(function (r) { return r.rape + r.other; }));
    var W = 720, H = 240, pad = 28, bw = (W - pad) / rows.length;
    var svg = '<svg viewBox="0 0 ' + W + " " + (H + 24) + '" role="img" aria-label="Bar chart of reported sex offenses per year">';
    rows.forEach(function (r, i) {
      var x = pad + i * bw + bw * 0.15, w = bw * 0.7;
      var hr = (r.rape / max) * (H - 20), ho = (r.other / max) * (H - 20);
      svg += '<g><title>' + r.y + ": " + num(r.rape) + " rape, " + num(r.other) + " fondling/incest/statutory</title>" +
        '<rect x="' + x + '" y="' + (H - hr) + '" width="' + w + '" height="' + hr + '" class="bar-rape"/>' +
        '<rect x="' + x + '" y="' + (H - hr - ho) + '" width="' + w + '" height="' + ho + '" class="bar-other"/>' +
        '<text x="' + (x + w / 2) + '" y="' + (H - hr - ho - 5) + '" class="bar-lbl">' + num(r.rape + r.other) + "</text>" +
        '<text x="' + (x + w / 2) + '" y="' + (H + 16) + '" class="bar-yr">' + r.y + "</text></g>";
    });
    svg += "</svg>";
    el.innerHTML = svg + '<div class="legend"><span><i class="bar-rape"></i>Rape</span><span><i class="bar-other"></i>Fondling, incest, statutory rape</span></div>';
    document.getElementById("trend-caption").innerHTML =
      "National totals, all reporting institutions (on-campus + non-campus + public property). 2020 dips because campuses were closed. Source: " +
      '<a href="' + esc(CLERY.sourceUrl) + '" rel="noopener">U.S. Dept. of Education Clery Act data</a>.';
  })();

  // ---- Rankings ----
  var rankCaption = document.getElementById("rank-caption");
  function renderRanking(mode) {
    var rows, cap = "";
    if (mode === "payout") {
      cap = "Largest settlements and federal fines in the major cases tracked below.";
      rows = real.filter(function (c) { return c.payout; })
        .sort(function (a, b) { return b.payout - a.payout; })
        .map(function (c) { return { name: c.school, sub: c.title, v: c.payout, label: money(c.payout), href: "#case-" + c.id }; });
    } else if (mode === "state" && CLERY) {
      cap = "Total reported sex offenses by state, " + span + ".";
      var idx = CLERY.years.length - recentYears.length;
      rows = Object.keys(CLERY.states).map(function (s) {
        var t = CLERY.states[s].slice(idx).reduce(function (a, b) { return a + b; }, 0);
        return { name: s, sub: "", v: t, label: num(t) };
      }).sort(function (a, b) { return b.v - a.v; });
    } else if (mode === "rate") {
      cap = "Reported sex offenses per 10,000 students per year, " + span + ". Only campuses with 5,000+ students are included, because tiny enrollments distort rates.";
      rows = campuses.filter(function (c) { return c.enroll >= 5000; }).map(function (c) {
        var r = (c.total / recentYears.length) / c.enroll * 10000;
        return { name: c.name, sub: c.city + ", " + c.state + " · " + num(c.total) + " reports, " + num(c.enroll) + " students", v: r, label: r.toFixed(1) };
      }).sort(function (a, b) { return b.v - a.v; });
    } else {
      cap = "Campuses with the most reported sex offenses, " + span + " combined. Large schools, and schools where survivors are more willing to report, rank higher.";
      rows = campuses.slice().sort(function (a, b) { return b.total - a.total; }).map(function (c) {
        return { name: c.name, sub: c.city + ", " + c.state + " · " + num(c.rape) + " rape, " + num(c.fondl) + " fondling", v: c.total, label: num(c.total) };
      });
    }
    rankCaption.textContent = cap;
    var max = rows.length ? rows[0].v : 1;
    document.getElementById("ranking").innerHTML = rows.slice(0, 25).map(function (r) {
      var title = r.href ? '<a href="' + esc(r.href) + '">' + esc(r.name) + "</a>" : esc(r.name);
      return '<li><div class="name">' + title + (r.sub ? '<div class="sub">' + esc(r.sub) + "</div>" : "") +
        '<div class="bar" style="width:' + Math.max(2, 100 * r.v / max).toFixed(1) + '%"></div></div><div class="val">' + esc(r.label) + "</div></li>";
    }).join("") || "<li>No data loaded.</li>";
  }
  toggleGroup("data-rank", renderRanking);
  renderRanking(campuses.length ? "count" : "payout");
  if (!campuses.length) document.querySelectorAll("[data-rank]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-rank") === "payout"); });

  // ---- School lookup ----
  var shown = 50;
  var sq = document.getElementById("sq");
  function renderSchools() {
    var q = sq.value.trim().toLowerCase();
    var list = !q ? campuses : campuses.filter(function (c) {
      return (c.name + " " + c.city + " " + c.state).toLowerCase().indexOf(q) !== -1 || c.state.toLowerCase() === q;
    });
    var head = "<thead><tr><th>School</th><th>Location</th>" +
      recentYears.map(function (y) { return '<th class="n">' + y + "</th>"; }).join("") +
      '<th class="n">Total</th><th class="n">Rape</th><th class="n">Per 10k</th></tr></thead>';
    var body = list.slice(0, shown).map(function (c) {
      var rate = c.enroll ? ((c.total / recentYears.length) / c.enroll * 10000).toFixed(1) : "—";
      return "<tr><td>" + esc(c.name) + "</td><td>" + esc(c.city) + ", " + esc(c.state) + "</td>" +
        c.years.map(function (v) { return '<td class="n">' + num(v[0] + v[1] + v[2]) + "</td>"; }).join("") +
        '<td class="n"><b>' + num(c.total) + '</b></td><td class="n">' + num(c.rape) + '</td><td class="n">' + rate + "</td></tr>";
    }).join("");
    document.getElementById("schools").innerHTML = head + "<tbody>" + body + "</tbody>";
    document.getElementById("scount").textContent = CLERY
      ? "Showing " + Math.min(shown, list.length) + " of " + num(list.length) + " campuses with reported sex offenses, " + span + ". Schools not listed reported zero."
      : "Federal campus data not loaded.";
    document.getElementById("smore").hidden = list.length <= shown;
  }
  sq.addEventListener("input", function () { shown = 50; renderSchools(); });
  document.getElementById("smore").addEventListener("click", function () { shown += 100; renderSchools(); });
  renderSchools();

  // ---- Major case list ----
  var statusSel = document.getElementById("status");
  Object.keys(STATUS_LABELS).forEach(function (k) {
    var o = document.createElement("option");
    o.value = k; o.textContent = STATUS_LABELS[k];
    statusSel.appendChild(o);
  });

  function caseHTML(c) {
    var named = (c.named || []).map(function (n) {
      return "<strong>" + esc(n.name) + "</strong> <em>— " + esc(n.basis) + "</em>";
    }).join("<br>");
    return '<article class="case" id="case-' + esc(c.id) + '">' +
      "<h3>" + esc(c.school) + "</h3>" +
      '<div class="meta"><span class="badge b-' + esc(c.statusCategory) + '">' + esc(STATUS_LABELS[c.statusCategory]) + "</span>" +
      esc(c.city) + ", " + esc(c.state) + " · incident " + esc(c.year) + " · " + esc(c.type) + "</div>" +
      "<p><strong>" + esc(c.title) + "</strong></p>" +
      "<p>" + esc(c.summary) + "</p>" +
      "<p><strong>Current status:</strong> " + esc(c.status) + "</p>" +
      (c.payout ? "<p><strong>Settlements / fines:</strong> " + money(c.payout) + "</p>" : "") +
      (named ? '<p class="named"><strong>Named individual(s):</strong><br>' + named + "</p>" : "") +
      (c.namingNote ? '<p class="naming-note">' + esc(c.namingNote) + "</p>" : "") +
      '<ul class="sources">' + c.sources.map(function (s) {
        return '<li><a href="' + esc(s.url) + '" rel="noopener" target="_blank">' + esc(s.label) + "</a></li>";
      }).join("") + "</ul></article>";
  }

  function renderCases() {
    var q = document.getElementById("q").value.trim().toLowerCase();
    var st = statusSel.value;
    var sort = document.getElementById("sort").value;
    var list = CASES.filter(function (c) {
      if (st && c.statusCategory !== st) return false;
      if (!q) return true;
      return [c.school, c.city, c.state, c.title, c.summary, c.type, c.status].join(" ").toLowerCase().indexOf(q) !== -1;
    });
    list.sort(function (a, b) {
      if (sort === "payout") return (b.payout || 0) - (a.payout || 0);
      if (sort === "school") return a.school.localeCompare(b.school);
      return b.reported - a.reported || b.year - a.year;
    });
    document.getElementById("count").textContent = list.length + " of " + CASES.length + " cases";
    document.getElementById("cases").innerHTML = list.map(caseHTML).join("");
  }
  ["q", "status", "sort"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", renderCases);
  });
  renderCases();
})();
