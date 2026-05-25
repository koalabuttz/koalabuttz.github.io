"use strict";

/* ─────────────────────────────────────────────────────────────────
   ASCII plasma — characters in a <pre>, density via brightness ramp.
   Color is applied entirely in CSS via background-clip + animated
   gradient. Same code, both inline and fullscreen.
   ───────────────────────────────────────────────────────────────── */

const RAMP = "  .,-:;!=*#%@";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

function plasmaFrame(cols, rows, t) {
  const cx = cols / 2, cy = rows / 2;
  let out = "";
  for (let y = 0; y < rows; y++) {
    let line = "";
    for (let x = 0; x < cols; x++) {
      const dx = x - cx, dy = (y - cy) * 2;
      const r = Math.sqrt(dx * dx + dy * dy);
      const v =
        Math.sin(x * 0.22 + t * 1.7) +
        Math.sin(y * 0.42 + t * 1.3) +
        Math.sin((x + y) * 0.18 + t * 1.0) +
        Math.sin(r * 0.30 - t * 2.1);
      let idx = ((v + 4) / 8) * (RAMP.length - 1);
      if (idx < 0) idx = 0;
      if (idx > RAMP.length - 1) idx = RAMP.length - 1;
      line += RAMP[idx | 0];
    }
    out += line + "\n";
  }
  return out;
}

/* inline plasma — renders one frame always, animates only if motion allowed */
const plasma = (function () {
  const el = document.getElementById("plasma");
  if (!el) return null;
  function cols() { return window.innerWidth < 520 ? 32 : 40; }
  let t = 0;
  let timer = 0;
  function tick() {
    el.textContent = plasmaFrame(cols(), 8, t);
    t = (t + 0.1) % 10000;
  }
  function start() {
    if (timer || reducedMotion.matches) return;
    timer = setInterval(tick, 100);
  }
  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = 0;
  }
  tick();
  start();
  return { start, stop };
})();

/* press D — fullscreen ASCII demo with scroller row */
const demo = document.getElementById("demo");
const demoPre = document.getElementById("demoPre");
const page = document.querySelector(".page");

const GREETZ =
  "    *** ~david / full demo *** " +
  "here's to the demoscene that inspired this, and to every machine " +
  "the world gave up on. " +
  "this entire effect is text characters. no canvas. no images. " +
  "the rainbow is one css gradient. " +
  "press esc or d to return ***    ";

let demoRunning = false;
let demoT = 0;
let demoTimer = 0;
let demoSize = { cols: 0, rows: 0 };
let demoScrollX = 0;
let lastFocus = null;

function fitDemo() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const cols = Math.max(40, Math.floor(vw / 8.4) - 4);
  const rows = Math.max(20, Math.floor(vh / 13)  - 4);
  return { cols, rows };
}

function tickDemo() {
  if (!demoRunning) return;
  const { cols, rows } = demoSize;
  const frame = plasmaFrame(cols, rows, demoT).split("\n");

  // overlay scroller on a middle row; clear neighbors for legibility
  const mid = Math.floor(rows * 0.55);
  const scrollOffset = demoScrollX % GREETZ.length;
  let row = "";
  for (let x = 0; x < cols; x++) {
    row += GREETZ[(x + scrollOffset) % GREETZ.length];
  }
  frame[mid] = row;
  if (mid > 0)         frame[mid - 1] = " ".repeat(cols);
  if (mid < rows - 1)  frame[mid + 1] = " ".repeat(cols);

  demoPre.textContent = frame.join("\n");
  demoT = (demoT + 0.08) % 10000;
  demoScrollX++;
}

function enterDemo() {
  demoSize = fitDemo();
  demoRunning = true;
  lastFocus = document.activeElement;        // restore on exit
  if (page) page.inert = true;               // background non-interactive (focus trap)
  demo.setAttribute("aria-hidden", "false");
  demo.classList.add("on");
  demo.focus();
  tickDemo();
  if (!reducedMotion.matches) demoTimer = setInterval(tickDemo, 80);
}
function exitDemo() {
  demoRunning = false;
  demo.classList.remove("on");
  demo.setAttribute("aria-hidden", "true");
  if (page) page.inert = false;
  if (demoTimer) { clearInterval(demoTimer); demoTimer = 0; }
  if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  lastFocus = null;
}

document.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
  if (e.key === "d" || e.key === "D") {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (demoRunning) exitDemo(); else enterDemo();
  } else if (e.key === "Escape" && demoRunning) {
    exitDemo();
  } else if (e.key === "Tab" && demoRunning) {
    // no focusable controls inside; keep focus on the dialog
    // (fallback for browsers without `inert` support on .page)
    e.preventDefault();
    demo.focus();
  }
});
demo.addEventListener("click", exitDemo);
window.addEventListener("resize", () => { if (demoRunning) demoSize = fitDemo(); });

/* pause animations when tab is hidden */
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    plasma?.stop();
    if (demoTimer) { clearInterval(demoTimer); demoTimer = 0; }
  } else {
    plasma?.start();
    if (demoRunning && !reducedMotion.matches && !demoTimer) {
      demoTimer = setInterval(tickDemo, 80);
    }
  }
});

/* react to reduced-motion preference changes mid-session */
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) {
    plasma?.stop();
    if (demoTimer) { clearInterval(demoTimer); demoTimer = 0; }
  } else if (!document.hidden) {
    plasma?.start();
    if (demoRunning && !demoTimer) {
      demoTimer = setInterval(tickDemo, 80);
    }
  }
});

/* visitor counter — real global count via a tiny Cloudflare Worker (see counter/).
   Degrades silently to the static number in the HTML if COUNTER_URL is unset or
   the request fails, so the page never *depends* on the backend being up. */
(function () {
  const el = document.getElementById("hits");
  if (!el) return;
  const COUNTER_URL = "https://davidlewis-counter.koalabuttz.workers.dev/";
  if (!COUNTER_URL) return;
  fetch(COUNTER_URL)
    .then((r) => r.json())
    .then((d) => {
      if (Number.isFinite(d.n)) el.textContent = String(d.n).padStart(7, "0");
    })
    .catch(() => {});
})();

/* dynamic timezone offset for Cambridge, MA (America/New_York) */
(function () {
  const el = document.getElementById("utc");
  if (!el) return;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    const tz = parts.find(p => p.type === "timeZoneName")?.value || "";
    // "GMT-4" / "GMT-5" / "GMT" → "utc −4" / "utc −5" / "utc"
    el.textContent = tz
      .replace("GMT", "utc")
      .replace("-", " −")
      .replace("+", " +");
  } catch { /* leave static fallback */ }
})();

/* dynamic page size — sum of same-origin HTML + CSS + JS bytes */
window.addEventListener("load", () => {
  const el = document.getElementById("size");
  if (!el) return;
  try {
    let total = 0;
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav?.decodedBodySize) total += nav.decodedBodySize;
    for (const r of performance.getEntriesByType("resource")) {
      try {
        if (new URL(r.name).origin === location.origin && r.decodedBodySize) {
          total += r.decodedBodySize;
        }
      } catch { /* ignore unparsable URLs */ }
    }
    if (total > 0) el.textContent = "~" + (total / 1024).toFixed(1) + " KB";
  } catch { /* leave static fallback */ }
});

/* §4 notes — my published blog posts, read straight from my own PDS.
   GreenGale stores each post as an `app.greengale.document` record (Markdown in
   `content`); we read the *public* ones with an unauthenticated listRecords call
   and link out to the greengale.app permalink. Three outcomes:
     • posts found       → render them
     • reachable, none   → leave the static "blog in the works" row
     • PDS unreachable    → a "down for maintenance" row, so an outage never reads
                            as "nothing published". The page itself always loads. */
(async function () {
  const el = document.querySelector(".notes");
  if (!el) return;

  // Hardcode what I control (like COUNTER_URL). Unset DID → keep static fallback.
  const GREENGALE_DID = "did:plc:xn3l7ogsxym5ixxugidum5dw";  // david.yapfest.club
  const GREENGALE_PDS = "https://yapfest.club";  // my PDS — a fetch failure here = "down for maintenance". Update if I migrate.
  const MAX_POSTS = 6;
  if (!GREENGALE_DID) return;

  try {
    const pds = GREENGALE_PDS || (await resolvePds(GREENGALE_DID));
    if (!pds) throw new Error("unresolved PDS");
    const url =
      pds + "/xrpc/com.atproto.repo.listRecords?repo=" +
      encodeURIComponent(GREENGALE_DID) +
      "&collection=app.greengale.document&limit=50";
    const res = await fetch(url);
    if (!res.ok) throw new Error("PDS " + res.status);
    const posts = normalizePosts(await res.json()).slice(0, MAX_POSTS);
    if (posts.length) el.replaceChildren(buildRows(posts));
    // reachable but nothing public yet → leave the static "blog in the works" row.
  } catch {
    // PDS unreachable / erroring → say so explicitly instead of looking empty.
    el.replaceChildren(maintenanceRow());
  }

  // did:plc → PDS host via the canonical directory. (For did:web, set GREENGALE_PDS.)
  async function resolvePds(did) {
    const doc = await fetch("https://plc.directory/" + encodeURIComponent(did))
      .then((r) => r.json());
    return (doc.service || []).find((s) => s.id === "#atproto_pds")?.serviceEndpoint;
  }

  // Shape the raw listRecords payload into what §4 needs. Kept separate so a
  // future in-page Markdown renderer can reuse it (it also carries `content`).
  function normalizePosts(json) {
    return (json.records || [])
      .map((rec) => {
        const v = rec.value || {};
        return {
          title: v.title || "(untitled)",
          subtitle: v.subtitle || "",
          date: (v.publishedAt || "").slice(0, 10),   // ISO → YYYY-MM-DD
          permalink: (v.url || "") + (v.path || ""),
          visibility: v.visibility,
          content: v.content || "",                    // Markdown, unused in v1
        };
      })
      .filter((p) => p.visibility === "public" && /^https:\/\//.test(p.permalink) && p.date)
      .sort((a, b) => (a.date < b.date ? 1 : -1));      // newest first
  }

  // date · title→permalink · "read →", one 3-cell row per post in the .notes grid.
  function buildRows(posts) {
    const frag = document.createDocumentFragment();
    for (const p of posts) {
      const d = document.createElement("span");
      d.className = "d";
      d.textContent = p.date;

      const a = document.createElement("a");
      a.className = "t";
      a.href = p.permalink;
      a.textContent = p.title;

      const s = document.createElement("span");
      s.className = "s";
      s.textContent = "read →";

      frag.append(d, a, s);
    }
    return frag;
  }

  // Shown when my PDS can't be reached — distinct from the "no posts yet" case,
  // so an outage never masquerades as "nothing published".
  function maintenanceRow() {
    const frag = document.createDocumentFragment();
    const cells = [["d", "—"], ["t", "blog is down for maintenance — back soon"], ["s", "503"]];
    for (const [cls, text] of cells) {
      const span = document.createElement("span");
      span.className = cls;
      span.textContent = text;
      frag.append(span);
    }
    return frag;
  }
})();
