"use strict";
// Request Denied - every figure below is read from D (payload.json); prose that quotes a
// number computes it here so the text cannot drift from the data.

const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString("en-US");
const pct = (a, b, d = 0) => (b ? (100 * a / b).toFixed(d) : "0") + "%";
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const C = D.counts;
const STATE_NAMES = {AR: "Arkansas", AZ: "Arizona", DC: "D.C.", GA: "Georgia", IA: "Iowa", KS: "Kansas", ME: "Maine",
  NJ: "New Jersey", OK: "Oklahoma", UT: "Utah", VT: "Vermont", WI: "Wisconsin", AK: "Alaska", NY: "New York"};

// ---- masthead -----------------------------------------------------------------
$("dek").innerHTML =
  "A personalized plate is seven characters, and a state gets to decide what they mean. " +
  "California asks you what you meant, then reads your plate the <b>worst way it can</b>. " +
  "Texas doesn&rsquo;t ask. In 2012 a dozen other states turned out to be banning " +
  "<b>each other&rsquo;s lists</b>.";

$("stripe").innerHTML = [
  [fmt(C.ca15_denied), "California denials with the reviewer's comment, 2015–16"],
  [fmt(C.ny_issued), "plates New York issued, 2010–14, for comparison"],
  [fmt(D.states.length), "states whose 2012 banned lists could be read and compared"],
  [fmt(C.tx), "plates Texas declined in 2025, each with its date"],
].map(([v, k]) => `<div><div class="v">${v}</div><div class="k">${esc(k)}</div></div>`).join("");

// ---- tooltip (one element, driven by data-tip on any mark) ---------------------
const tip = $("tip");
function showTip(el, x, y) {
  tip.innerHTML = el.getAttribute("data-tip"); tip.hidden = false;
  const w = tip.offsetWidth || 200, h = tip.offsetHeight || 40;
  tip.style.left = Math.min(x + 14, (window.innerWidth || 1000) - w - 8) + "px";
  tip.style.top = Math.max(8, y - h - 12) + "px";
}
document.addEventListener("mousemove", e => {
  const el = e.target && e.target.closest ? e.target.closest("[data-tip]") : null;
  if (el) showTip(el, e.clientX, e.clientY); else tip.hidden = true;
});
document.addEventListener("focusin", e => {
  const el = e.target && e.target.closest ? e.target.closest("[data-tip]") : null;
  if (!el) return;
  const r = el.getBoundingClientRect ? el.getBoundingClientRect() : {left: 0, top: 0, width: 0};
  showTip(el, r.left + r.width / 2, r.top);
});
document.addEventListener("focusout", () => { tip.hidden = true; });

// ---- 01 two readers -------------------------------------------------------------
const nyCount = D.examples.filter(e => e.ny > 0).length;
$("lede1").innerHTML =
  `California&rsquo;s application asks what the plate means. Flagged applications go to a review committee, ` +
  `whose comments survive in spreadsheets released under public records requests. ` +
  `Of ${fmt(C.ca15)} flagged decisions in 2015&ndash;16, <b>${pct(C.ca15_denied, C.ca15)} were denials</b>. ` +
  `Below are ${D.examples.length} of them where the explanation is plausibly innocent, with both texts exactly as the DMV recorded them. ` +
  `<b>${nyCount}</b> of these exact plates were issued in New York, which kept no explanation at all.`;

const KIND = [
  ["all", "All", () => true],
  ["num", "Numbers", e => /GANG|HATE (SYMBOL|NUMBER)|AREA CODE|\b\d/.test(e.reviewer)],
  ["gun", "Weapons & violence", e => /GUN|RIFLE|KILL|MAGNUM|TRIGGER|WEAPON|HOSTILE|HATE\b/.test(e.reviewer) && !/GANG|SYMBOL|NUMBER/.test(e.reviewer)],
  ["sex", "Sex & bodies", e => /SEX|BREAST|THREESOME|BONDAGE|ASS|HO |NUT|TOILET|POOP/.test(e.reviewer)],
];
let kind = "all";
function plateHTML(p) { return `<div class="plate" aria-label="Plate ${esc(p)}"><small>CALIFORNIA</small>${esc(p)}</div>`; }
function drawDeck() {
  const test = KIND.find(k => k[0] === kind)[2];
  const shown = D.examples.filter(test);
  $("deck").innerHTML = shown.map(e => `
    <article class="slip">
      <span class="stamp">DENIED ${esc(e.years)}</span>
      ${plateHTML(e.plate)}
      <p class="said"><span class="who">Applicant</span>${esc(e.meaning)}</p>
      <p class="said rev"><span class="who">Reviewer</span>${esc(e.reviewer)}</p>
      ${e.ny ? `<span class="nybadge">&#10003; Issued in New York, 2010&ndash;14</span>` : ""}
    </article>`).join("");
  $("deckctrls").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.k === kind ? "true" : "false"));
}
$("deckctrls").innerHTML = KIND.map(([k, label, t]) =>
  `<button class="pill" data-k="${k}" aria-pressed="false">${label} <span class="mono">${D.examples.filter(t).length}</span></button>`).join("");
$("deckctrls").addEventListener("click", ev => {
  const b = ev.target && ev.target.closest ? ev.target.closest("button") : null;
  if (b) { kind = b.dataset.k; drawDeck(); }
});
drawDeck();

// ---- 02 code numbers --------------------------------------------------------------
const WHY = {"13": "Sureño gang number", "14": "Norteño gang number; also white-supremacist code",
             "18": "18th Street gang", "88": "neo-Nazi code for HH", "69": "sexual"};
const rate = o => o.flagged ? o.approved / o.flagged : 0;
const s13 = D.suffixes.find(s => s.s === "13"), s88 = D.suffixes.find(s => s.s === "88");
$("lede2").innerHTML =
  `California&rsquo;s reviewers read the last digits of a plate as code. A flagged plate ending in 13 was approved ` +
  `<b>${pct(s13.ca15.approved, s13.ca15.flagged)}</b> of the time in 2015&ndash;16, down from ${pct(s13.ca13.approved, s13.ca13.flagged)} in 2012&ndash;13. ` +
  `Birthdays, anniversaries, union locals and model years all get caught. ` +
  `Over four years New York issued <b>${fmt(s13.ny)}</b> plates ending in 13 and ${fmt(s88.ny)} ending in 88. ` +
  `Those are counts of issued plates, not rates, because New York&rsquo;s file has no flagged subset to compare against.`;

(function suffixChart() {
  const W = 470, rowH = 44, top = 18, left = 118, right = 20, H = top + rowH * D.suffixes.length + 26;
  const max = 0.30, x = v => left + (W - left - right) * Math.min(v, max) / max;
  let g = "";
  for (let t = 0; t <= max + 1e-9; t += 0.1) {
    g += `<line class="grid" x1="${x(t)}" x2="${x(t)}" y1="${top - 6}" y2="${H - 22}"/>` +
         `<text x="${x(t)}" y="${H - 6}" text-anchor="middle">${Math.round(t * 100)}%</text>`;
  }
  D.suffixes.forEach((s, i) => {
    const y = top + i * rowH + rowH / 2, a = rate(s.ca13), b = rate(s.ca15);
    g += `<text class="ink" x="0" y="${y - 3}" style="font-size:15px;font-weight:600">…${s.s}</text>` +
         `<text x="0" y="${y + 12}" style="font-size:9.5px">${esc(WHY[s.s])}</text>` +
         `<line x1="${x(a)}" x2="${x(b)}" y1="${y}" y2="${y}" stroke="var(--line-2)" stroke-width="2"/>`;
    const dot = (v, o, cls, label) =>
      `<g tabindex="0" data-tip="<b>…${s.s}</b> · ${label}<br>${fmt(o.approved)} of ${fmt(o.flagged)} flagged approved (${pct(o.approved, o.flagged, 1)})">` +
      `<circle class="hit" cx="${x(v)}" cy="${y}" r="12"/>${cls}</g>`;
    g += dot(a, s.ca13, `<circle cx="${x(a)}" cy="${y}" r="5.5" fill="var(--surface)" stroke="var(--s2)" stroke-width="2.5"/>`, "2012–13");
    g += dot(b, s.ca15, `<circle cx="${x(b)}" cy="${y}" r="6" fill="var(--s1)" stroke="var(--surface)" stroke-width="2"/>`, "2015–16");
  });
  $("suffix").innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Approval rate of flagged California plates by ending, two periods">${g}</svg>`;
  $("suffix-legend").innerHTML =
    `<span><i class="sw ring" style="border-color:var(--s2)"></i>2012–13</span>` +
    `<span><i class="sw" style="background:var(--s1)"></i>2015–16</span>`;
  $("suffix-table").innerHTML = `<table><tr><th>Ending</th><th>CA 2012–13 flagged</th><th>approved</th><th>CA 2015–16 flagged</th><th>approved</th><th>NY issued 2010–14</th></tr>` +
    D.suffixes.map(s => `<tr><td>…${s.s}</td><td>${fmt(s.ca13.flagged)}</td><td>${pct(s.ca13.approved, s.ca13.flagged, 1)}</td>` +
      `<td>${fmt(s.ca15.flagged)}</td><td>${pct(s.ca15.approved, s.ca15.flagged, 1)}</td><td>${fmt(s.ny)}</td></tr>`).join("") + `</table>`;
})();

(function vocabChart() {
  const rows = D.vocab.slice().sort((a, b) => b.n - a.n), base = D.vocab_base;
  const W = 360, rowH = 26, left = 118, right = 44, H = rowH * rows.length + 4;
  const max = rows[0].n / base, x = v => (W - left - right) * v / max;
  let g = "";
  rows.forEach((r, i) => {
    const y = i * rowH, w = Math.max(2, x(r.n / base));
    g += `<g tabindex="0" data-tip="<b>${esc(r.k)}</b><br>${fmt(r.n)} of ${fmt(base)} denial comments (${pct(r.n, base, 1)})">` +
         `<rect class="hit" x="0" y="${y}" width="${W}" height="${rowH}"/>` +
         `<text x="${left - 8}" y="${y + 16}" text-anchor="end">${esc(r.k)}</text>` +
         `<path d="M${left} ${y + 6}h${w - 4}a4 4 0 0 1 4 4v6a4 4 0 0 1 -4 4h-${w - 4}z" fill="var(--s1)"/>` +
         `<text class="ink" x="${left + w + 6}" y="${y + 16}">${pct(r.n, base)}</text></g>`;
  });
  $("vocab").innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Share of denial comments mentioning each term">${g}</svg>`;
  $("vocab-read").textContent = `Share of ${fmt(base)} denial comments containing the term. A comment can mention several.`;
})();

// ---- 03 borrowed lists ------------------------------------------------------------
const S = D.states.map(s => s.s), O = D.overlap;
let best = {v: 0};
O.forEach((row, i) => row.forEach((v, j) => { if (v != null && v > best.v) best = {v, a: S[i], b: S[j]}; }));
const ut = S.indexOf("UT"), utMax = Math.max(...O[ut].filter(v => v != null));
const oldfart = D.most_shared.find(m => m[0] === "OLDFART");
const meTotal = D.maine_sources.reduce((a, m) => a + m[1], 0), meTop = D.maine_sources[0];
$("lede3").innerHTML =
  `In 2012 governmentattic.org asked every state DMV for its list of banned plates. Twenty-six states and D.C. answered, and ${D.states.length} sent a list long enough to compare. ` +
  `Side by side they are not independent judgements. <b>${pct(best.v, 1)} of ${STATE_NAMES[best.a]}&rsquo;s list is on ${STATE_NAMES[best.b]}&rsquo;s</b>, ` +
  `and the same odd strings turn up everywhere: OLDFART is on ${oldfart ? oldfart[1] : "every one"} of the ${D.states.length}. ` +
  `Utah is the exception. No more than ${pct(utMax, 1)} of its list appears on any other, and it gives a reason for every plate.`;

(function heatmap() {
  const n = S.length, cell = 38, left = 40, top = 34, W = left + n * cell + 6, H = top + n * cell + 6;
  let g = "";
  S.forEach((s, j) => { g += `<text x="${left + j * cell + cell / 2}" y="${top - 10}" text-anchor="middle">${s}</text>`; });
  S.forEach((a, i) => {
    g += `<text x="${left - 8}" y="${top + i * cell + cell / 2 + 4}" text-anchor="end">${a}</text>`;
    S.forEach((b, j) => {
      const v = O[i][j], X = left + j * cell + 1, Y = top + i * cell + 1, sz = cell - 2;
      if (v == null) { g += `<rect x="${X}" y="${Y}" width="${sz}" height="${sz}" rx="4" fill="var(--sunk)"/>`; return; }
      const op = (0.06 + 0.94 * v).toFixed(3);
      g += `<g tabindex="0" data-tip="<b>${pct(v, 1)}</b> of ${esc(STATE_NAMES[a] || a)}&rsquo;s ${fmt(D.states[i].n)} banned plates<br>are also on ${esc(STATE_NAMES[b] || b)}&rsquo;s list">` +
           `<rect x="${X}" y="${Y}" width="${sz}" height="${sz}" rx="4" fill="var(--accent)" fill-opacity="${op}"/>` +
           (v >= 0.3 ? `<text x="${X + sz / 2}" y="${Y + sz / 2 + 4}" text-anchor="middle" style="font-size:10px;fill:${v > 0.5 ? "var(--surface)" : "var(--ink)"}">${Math.round(v * 100)}</text>` : "") +
           `</g>`;
    });
  });
  $("heat").innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Overlap between state banned-plate lists">${g}</svg>`;
  $("heat-read").textContent = "Darker means more of the row state's list is shared. Read across a row; the matrix is not symmetric, because lists differ in length.";
  $("heat-table").innerHTML = `<table><tr><th>List</th><th>plates</th>${S.map(s => `<th>${s}</th>`).join("")}</tr>` +
    S.map((a, i) => `<tr><td>${a}</td><td>${fmt(D.states[i].n)}</td>${O[i].map(v => `<td>${v == null ? "–" : Math.round(v * 100)}</td>`).join("")}</tr>`).join("") + `</table>`;
})();

(function utah() {
  const rows = D.utah, total = rows.reduce((a, r) => a + r[1], 0), W = 360, rowH = 24, left = 132, right = 40;
  const max = rows[0][1], x = v => (W - left - right) * v / max;
  let g = "";
  rows.forEach(([k, v], i) => {
    const y = i * rowH, w = Math.max(2, x(v)), label = k.toLowerCase();
    g += `<g tabindex="0" data-tip="<b>${esc(label)}</b><br>${fmt(v)} of ${fmt(total)} plates with a stated reason">` +
         `<rect class="hit" x="0" y="${y}" width="${W}" height="${rowH}"/>` +
         `<text x="${left - 8}" y="${y + 15}" text-anchor="end">${esc(label)}</text>` +
         `<path d="M${left} ${y + 5}h${w - 4}a4 4 0 0 1 4 4v6a4 4 0 0 1 -4 4h-${w - 4}z" fill="var(--s1)"/>` +
         `<text class="ink" x="${left + w + 6}" y="${y + 15}">${fmt(v)}</text></g>`;
  });
  $("utah").innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${rowH * rows.length + 2}" role="img" aria-label="Utah banned plates by stated reason">${g}</svg>`;
})();

$("shared").innerHTML = D.most_shared.map(([p, n]) => `<span class="chip">${esc(p)}<i>${n}/${D.states.length}</i></span>`).join("");
$("maine").innerHTML = `Maine&rsquo;s list tags each plate with a state: ${fmt(meTop[1])} of ${fmt(meTotal)} say ${STATE_NAMES[meTop[0]] || meTop[0]}. ` +
  D.maine_sources.slice(1).map(m => `${fmt(m[1])} ${STATE_NAMES[m[0]] || m[0]}`).join(", ") + ".";

// ---- 04 the calendar ----------------------------------------------------------------
const TAG = [["Musk", "var(--s1)"], ["ICE", "var(--s3)"], ["FAFO", "var(--s2)"]];
const byTag = t => D.tx_tagged.filter(d => d.tag === t);
const musk = byTag("Musk"), ice = byTag("ICE"), fafo = byTag("FAFO");
const mon = d => +d.date.slice(5, 7);
const muskSpring = musk.filter(d => mon(d) >= 3 && mon(d) <= 6).length;
$("lede4").innerHTML =
  `Texas&rsquo;s written criteria say it &ldquo;does not consider your meaning or intent because the public will not know this information.&rdquo; ` +
  `What it does keep is the date of each request, and the list follows the news. ` +
  `<b>${muskSpring} of ${musk.length}</b> plates insulting or naming Elon Musk were requested between March and June 2025, the months Musk&rsquo;s role at DOGE and the Tesla showroom protests were news. ` +
  `The ${ice.length} plates built on ICE all arrived in October and November. FAFO, rejected ${fafo.length} times, never went away.`;

(function months() {
  const W = 640, H = 150, left = 34, right = 10, top = 10, bottom = 22, m = D.tx_months, max = Math.max(...m);
  const bw = (W - left - right) / 12, y = v => top + (H - top - bottom) * (1 - v / max);
  const NAMES = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  let g = "";
  [0, 100, 200].forEach(t => { if (t <= max) g += `<line class="grid" x1="${left}" x2="${W - right}" y1="${y(t)}" y2="${y(t)}"/><text x="${left - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`; });
  m.forEach((v, i) => {
    const X = left + i * bw + 3, w = bw - 6, Y = y(v), h = H - bottom - Y;
    g += `<g tabindex="0" data-tip="<b>${NAMES[i]} 2025</b><br>${fmt(v)} declined plate requests">` +
         `<rect class="hit" x="${left + i * bw}" y="${top}" width="${bw}" height="${H - top - bottom}"/>` +
         `<path d="M${X} ${H - bottom}v-${h - 4}a4 4 0 0 1 4 -4h${w - 8}a4 4 0 0 1 4 4v${h - 4}z" fill="var(--line-2)"/>` +
         `<text x="${X + w / 2}" y="${H - 6}" text-anchor="middle">${NAMES[i]}</text></g>`;
  });
  $("months").innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Texas declined plates per month, 2025">${g}</svg>`;

  // one lane per tag, each plate a dot at its request date
  const laneH = 30, T = W, TH = laneH * TAG.length + 8;
  const day = d => (Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) - Date.UTC(2025, 0, 1)) / 864e5;
  const xd = d => left + (T - left - right) * day(d) / 365;
  let t = "";
  TAG.forEach(([tag, col], k) => {
    const cy = k * laneH + laneH / 2 + 2;
    t += `<line class="grid" x1="${left}" x2="${T - right}" y1="${cy}" y2="${cy}"/>` +
         `<text x="${left - 6}" y="${cy + 4}" text-anchor="end" class="ink">${tag}</text>`;
    const seen = {};
    byTag(tag).forEach(d => {
      const key = d.date.slice(0, 7) + Math.round(day(d.date) / 4); const off = (seen[key] = (seen[key] || 0) + 1) - 1;
      const cx = xd(d.date), yy = cy + (off % 2 ? 1 : -1) * Math.ceil(off / 2) * 7;
      t += `<g tabindex="0" data-tip="<b>${esc(d.plate)}</b><br>requested ${d.date}"><circle class="hit" cx="${cx}" cy="${yy}" r="9"/>` +
           `<circle cx="${cx}" cy="${yy}" r="4.5" fill="${col}" stroke="var(--surface)" stroke-width="2"/></g>`;
    });
  });
  $("tagline").innerHTML = `<svg class="chart" viewBox="0 0 ${T} ${TH}" role="img" aria-label="Declined Texas plates mentioning Musk, ICE or FAFO, by request date">${t}</svg>`;
  $("tag-legend").innerHTML = TAG.map(([tag, col]) => `<span><i class="sw" style="background:${col}"></i>${tag} <span class="mono">${byTag(tag).length}</span></span>`).join("") +
    `<span>Grey bars: all ${fmt(C.tx)} declined plates by month</span>`;
})();
$("note-tx").innerHTML = `<b>Small numbers.</b> ${musk.length} Musk plates and ${ice.length} ICE plates are a signal worth looking for in other years, not a trend. ` +
  `Tags are found by pattern (MUSK, ELON, ICE, FAFO) and read by eye. Only 2025 is here. Lists for 2023 and 2024 were reported in the press, but the files were not found.`;

// ---- methods & footer --------------------------------------------------------------
$("methods").innerHTML = `
<h4>Sources</h4>
<p><b>California, 2015–16:</b> ${fmt(C.ca15)} decisions on applications flagged for review, released to Noah Veltman under a public records request. <b>California, 2012–13:</b> review sheets released to MuckRock in 2014 and collected by Dan Nguyen. ${fmt(C.ca13)} decisions come from the 225 <code>.xlsx</code> sheets; the 72 older <code>.xls</code> sheets are not read. <b>New York, 2010–14:</b> every issued and rejected personalized plate plus the DMV&rsquo;s automatic ban list (the Red Guide), from WNYC&rsquo;s FOIL request. <b>2012 state lists:</b> governmentattic.org&rsquo;s request to every DMV, as scanned responses. <b>Texas, 2025:</b> the DMV&rsquo;s list of declined plates with request dates.</p>
<h4>What &ldquo;flagged&rdquo; means, and why the states can&rsquo;t be ranked</h4>
<p>California&rsquo;s files hold only applications the committee pulled for review, not every application, so an approval rate here is a rate among suspicious-looking plates. New York&rsquo;s file is the opposite: every issued plate, with no flag. So the page compares <i>what</i> each state refuses, never <i>how often</i>. Endings are matched on the final two characters after removing spaces.</p>
<h4>Reading the 2012 scans</h4>
<p>The responses are OCR of printed lists in about six layouts: columns, a plate plus an ID, a plate plus a reason (Utah), rejection letters with codes (Colorado, where only code 06 &ldquo;possibly offensive&rdquo; is kept), and lists interleaved with markers. Text was extracted with <code>pdftotext -layout</code>, split on runs of two or more spaces, with single spaces inside a plate removed. OCR noise remains, so treat the overlap figures as patterns across lists, not as plate-by-plate facts. Numbered blocks such as GODS1&ndash;GODS32 (Georgia) and FUBAR2&ndash;FUBAR96 (New Jersey) are ranges, not separate judgements. Eleven of the 27 responses were only a policy letter. Only the ${D.states.length} lists with at least 900 plates are compared.</p>
<h4>A trap in the Texas PDF</h4>
<p><code>pdftotext -layout</code> misaligns this file. Wherever a plate cell wraps, plates and dates drift apart by a row, pairing about 84 of 1,951 plates with a neighbour&rsquo;s date without any error. <code>-raw</code> and <code>-table</code> agree with each other and with the header&rsquo;s count, and the build refuses to run if they ever disagree.</p>
<h4>Choosing the examples</h4>
<p>The ${D.examples.length} plates in section 01 were picked by hand from the denials. Rules: the applicant&rsquo;s explanation is plausibly innocent; no slur appears in the plate or either text; nothing names or locates the applicant. Denials that failed those rules were dropped even when they made the point better. The text is pulled from the data by plate, never retyped. The only change is that two profanities in reviewer comments are masked. Innocent-sounding is not proof of innocence: some applicants plainly were trying it on, and reviewers catch real slurs every day. The claim is about how the reading is done, not that every denial is wrong.</p>
<h4>Where not to push this</h4>
<p>Three states and a snapshot of a dozen more are not the country, and 2012 is not today. The vocabulary counts are keyword matches on free-text comments, so &ldquo;gang&rdquo; includes &ldquo;no gang reference found&rdquo; if a reviewer wrote that.</p>`;

$("foot").innerHTML =
  `Data: <a href="https://github.com/veltman/ca-license-plates">veltman/ca-license-plates</a> · ` +
  `<a href="https://github.com/datanews/license-plates">datanews/license-plates</a> (WNYC) · ` +
  `<a href="https://github.com/dannguyen/dmv-vanity-plate-rejections">dannguyen/dmv-vanity-plate-rejections</a> ` +
  `(<a href="http://www.governmentattic.org/StateDMV-ForbidPlates.html">governmentattic.org</a>, MuckRock) · ` +
  `Texas DMV <a href="https://www.fox4news.com/news/2025-rejected-personalized-license-plates-texas">2025 declined plates</a> and ` +
  `<a href="https://www.txdmv.gov/sites/default/files/body-files/PLP_Criteria.pdf">plate criteria</a>. ` +
  `All are government records released under public records laws; none of the repositories states a licence, and this page carries derived counts and ${D.examples.length} quoted rows, not the files. ` +
  `Catalogued in <a href="https://tnriley.github.io/headwaters/">Headwaters</a>.`;

// ---- theme -------------------------------------------------------------------------
$("theme").onclick = () => {
  const cur = document.documentElement.getAttribute("data-theme");
  const dark = cur ? cur === "dark" : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
};
