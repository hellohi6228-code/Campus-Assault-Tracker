(function () {
  "use strict";

  var CASES = window.CASES || [];

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

  function num(n) { return n == null ? "n/a" : n.toLocaleString("en-US"); }

  // ---- Header stats ----
  var real = CASES.filter(function (c) { return c.statusCategory !== "discredited"; });
  var totalPayout = real.reduce(function (a, c) { return a + (c.payout || 0); }, 0);
  var totalAffected = real.reduce(function (a, c) { return a + (c.affected || 0); }, 0);
  var convictions = real.filter(function (c) { return c.named && c.named.some(function (n) { return /convicted|pleaded guilty/i.test(n.basis); }); }).length;
  var states = new Set(real.map(function (c) { return c.state; })).size;
  document.getElementById("stats").innerHTML = [
    [real.length, "documented cases"],
    [states, "states"],
    [num(totalAffected) + "+", "survivors / plaintiffs"],
    [money(totalPayout), "settlements & fines"],
    [convictions, "cases with a conviction"]
  ].map(function (s) { return '<div class="stat"><b>' + s[0] + "</b><span>" + s[1] + "</span></div>"; }).join("");

  // ---- Map ----
  // Rankings and the case list must still render if the map library fails to load.
  if (window.L) initMap();
  else document.getElementById("map").innerHTML = '<p style="padding:16px">Map could not load. The case list below is complete.</p>';

  function initMap() {
  var map = L.map("map", { scrollWheelZoom: false }).setView([39.5, -97], 4);
  var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  L.tileLayer("https://{s}.basemaps.cartocdn.com/" + (dark ? "dark_all" : "light_all") + "/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 18
  }).addTo(map);

  var maxAffected = Math.max.apply(null, real.map(function (c) { return c.affected || 1; }));
  function heatPoints(mode) {
    return real.map(function (c) {
      var w = mode === "cases" ? 0.6
        : 0.25 + 0.75 * Math.log10((c.affected || 1) + 1) / Math.log10(maxAffected + 1);
      return [c.lat, c.lng, w];
    });
  }
  var heat = L.heatLayer(heatPoints("affected"), { radius: 38, blur: 28, maxZoom: 8, minOpacity: 0.35 }).addTo(map);

  var colors = getComputedStyle(document.documentElement);
  CASES.forEach(function (c) {
    var col = colors.getPropertyValue("--c-" + c.statusCategory).trim() || "#b3261e";
    L.circleMarker([c.lat, c.lng], { radius: 6, color: "#fff", weight: 1.5, fillColor: col, fillOpacity: 1 })
      .addTo(map)
      .bindPopup(
        "<b>" + esc(c.school) + "</b>" + esc(c.title) +
        "<br><small>" + esc(STATUS_LABELS[c.statusCategory]) + " · " + esc(c.status) + "</small>" +
        '<br><a href="#case-' + esc(c.id) + '">Full case &amp; sources ↓</a>'
      );
  });

  document.querySelectorAll("[data-weight]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("[data-weight]").forEach(function (x) { x.classList.toggle("on", x === b); });
      heat.setLatLngs(heatPoints(b.dataset.weight));
    });
  });
  }

  // ---- Rankings ----
  function renderRanking(mode) {
    var rows;
    if (mode === "state") {
      var by = {};
      real.forEach(function (c) {
        by[c.state] = by[c.state] || { name: c.state, v: 0, payout: 0 };
        by[c.state].v++; by[c.state].payout += c.payout || 0;
      });
      rows = Object.keys(by).map(function (k) { return by[k]; })
        .sort(function (a, b) { return b.v - a.v || b.payout - a.payout; })
        .map(function (r) { return { name: r.name, sub: money(r.payout) + " paid", v: r.v, label: r.v + (r.v === 1 ? " case" : " cases") }; });
    } else {
      var key = mode;
      rows = real.filter(function (c) { return c[key]; })
        .sort(function (a, b) { return b[key] - a[key]; })
        .map(function (c) {
          return { name: c.school, sub: c.title, v: c[key], label: key === "payout" ? money(c.payout) : num(c.affected), id: c.id };
        });
    }
    var max = rows.length ? rows[0].v : 1;
    document.getElementById("ranking").innerHTML = rows.slice(0, 15).map(function (r) {
      var title = r.id ? '<a href="#case-' + esc(r.id) + '">' + esc(r.name) + "</a>" : esc(r.name);
      return '<li><div class="name">' + title + '<div class="naming-note" style="font-style:normal">' + esc(r.sub) +
        '</div><div class="bar" style="width:' + Math.max(2, 100 * r.v / max).toFixed(1) + '%"></div></div><div class="val">' + esc(r.label) + "</div></li>";
    }).join("");
  }
  document.querySelectorAll("[data-rank]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("[data-rank]").forEach(function (x) { x.classList.toggle("on", x === b); });
      renderRanking(b.dataset.rank);
    });
  });
  renderRanking("payout");

  // ---- Case list ----
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
