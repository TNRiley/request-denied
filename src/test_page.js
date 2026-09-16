/* Run the built page's script against a stub DOM and assert the figures its prose commits to.
 * There is no browser in the build environment, so this is the check that the page executes.
 *     node test_page.js
 */
const fs = require("fs"), path = require("path"), assert = require("assert");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const m = html.match(/<script>\r?\n([\s\S]*?)\r?\n<\/script>/);
assert(m, "no inline script found in index.html");
const els = {};
function mkEl(id) {
  const L = {};
  const el = { id, _html: "", textContent: "", hidden: false, dataset: {}, style: {}, offsetWidth: 200, offsetHeight: 40,
    get innerHTML() { return this._html; }, set innerHTML(v) { this._html = String(v); },
    getAttribute: k => el["_" + k] ?? null, setAttribute: (k, v) => { el["_" + k] = v; },
    addEventListener: (k, fn) => { (L[k] = L[k] || []).push(fn); }, _listeners: L,
    querySelectorAll: () => [], closest: () => null, onclick: null };
  return el;
}
const document = { getElementById: id => (els[id] = els[id] || mkEl(id)), addEventListener: () => {},
  documentElement: mkEl("html") };
const window = { innerWidth: 1200, matchMedia: () => ({ matches: false }) };
new Function("document", "window", m[1])(document, window);

const ids = [...html.matchAll(/id="([^"]+)"/g)].map(x => x[1]);
for (const id of ["dek", "stripe", "lede1", "deck", "lede2", "suffix", "vocab", "lede3", "heat", "utah", "shared", "maine", "lede4", "months", "tagline", "methods", "foot"]) {
  assert(ids.includes(id), "template lacks #" + id);
  assert((els[id]._html || els[id].textContent).length > 20, "#" + id + " rendered nothing");
  assert(!/NaN|undefined|Infinity/.test(els[id]._html), "#" + id + " contains NaN/undefined");
}
const txt = id => els[id]._html.replace(/<[^>]+>/g, "").replace(/&rsquo;/g, "’").replace(/&ndash;/g, "–").replace(/&ldquo;|&rdquo;/g, '"');
// Checkpoints: a rebuild that parses the sources correctly reproduces these.
assert(/18,757/.test(txt("stripe")), "stripe: CA 2015-16 denials");
assert(/1,951/.test(txt("stripe")), "stripe: Texas 2025 count");
assert(/approved 7% of the time in 2015–16, down from 11% in 2012–13/.test(txt("lede2")), "lede2 suffix rates: " + txt("lede2"));
assert(/741 plates ending in 13 and 760 ending in 88/.test(txt("lede2")), "lede2 NY counts");
assert(/71% of Arkansas’s list is on Vermont’s/.test(txt("lede3")), "lede3 overlap: " + txt("lede3"));
assert(/7 of 7/.test(txt("lede4")), "lede4 Musk: " + txt("lede4"));
assert((els.deck._html.match(/class="slip"/g) || []).length === 30, "30 example slips");
assert(!/FUCK|SHIT/.test(els.deck._html), "unmasked profanity in examples");
console.log("ok: page script ran; checkpoints hold");
