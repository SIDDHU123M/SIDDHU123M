#!/usr/bin/env node
// Renders every graphic the profile README uses (dark + light) into dist/gfx, then writes
// README.md and dist/preview.html from the same config. Zero dependencies, Node 20+.
//
//   GITHUB_TOKEN=$(gh auth token) node scripts/gfx.mjs
//
// The workflow pushes dist/ to the `output` branch; README.md points at the raw files there.
// To change what the profile says, edit the config block below and re-run. Do not hand-edit README.md.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------- config

const USER = "SIDDHU123M";
const NAME = "Sidhartha";
const TAGLINE = "Full-stack and Android developer. Founder, DevLune Studio. Hyderabad, India.";
const RAW = `https://raw.githubusercontent.com/${USER}/${USER}/output/gfx/`;

// Keyed by file suffix. One accent per theme; everything else is neutral.
const THEMES = {
  "": { bg: "#101013", line: "#24242A", grid: "#151518", cell: "#15151A", ink: "#F4F4F5", dim: "#8B8B94", sub: "#6B6B75", accent: "#FF6B2C" },
  "-light": { bg: "#FFFFFF", line: "#E4E2DE", grid: "#F1EFEC", cell: "#EFEDEA", ink: "#1C1917", dim: "#57534E", sub: "#78716C", accent: "#C2410C" },
};

// text wraps at 45 chars, three lines max. lang picks the dot colour; stack is what is printed.
const PRODUCTS = [
  { title: "Membrain", href: "https://membrain.devlune.in", lang: "TypeScript", stack: "Node · SQLite · React 19", icon: "db", status: "npm, open source", site: "membrain.devlune.in", text: "Self-hosted AI memory server. One shared store for you and every agent, over MCP." },
  { title: "FruitPlaza", href: "https://fruitplaza.in", lang: "Kotlin", stack: "React · Supabase · Kotlin", icon: "cart", status: "live", site: "fruitplaza.in", text: "Subscription food delivery: geo-fenced regions, tamper-proof payments, admin panel, Android apps." },
  { title: "Kamyaa", href: "https://kamyaa.store", lang: "TypeScript", stack: "React · Supabase · Razorpay", icon: "cart", status: "live", site: "kamyaa.store", text: "Luxury candle store: referral engine, dynamic theming, real-time admin dashboard." },
  { title: "CK MART", href: "https://ckmart.store", lang: "TypeScript", stack: "React · Realtime · PWA", icon: "phone", status: "live", site: "ckmart.store", text: "Grocery delivery PWA: real-time order tracking, multi-role access." },
  { title: "SysWatch", href: "https://play.google.com/store/apps/details?id=in.devlune.syswatch", lang: "Kotlin", stack: "Kotlin · Rust · Supabase", icon: "monitor", status: "Google Play", site: "android", text: "Real-time PC hardware monitor on your phone. Kotlin app plus a Rust host agent." },
  { title: "Webmaster", href: "https://webmaster.devlune.in", lang: "TypeScript", stack: "Next.js · Workers · ClickHouse", icon: "chart", status: "live", site: "webmaster.devlune.in", text: "Cookieless, privacy-first web analytics." },
  { title: "LearnFlow", href: "https://learnflow.devlune.in", lang: "Rust", stack: "Tauri 2 · React · Firebase", icon: "play", status: "open beta", site: "learnflow.devlune.in", text: "Cross-platform course player for desktop and web, streaming from Google Drive." },
  { title: "Humanize", href: "https://humanize.devlune.in", lang: "TypeScript", stack: "Next.js · Edge · LLM pipeline", icon: "text", status: "live", site: "humanize.devlune.in", text: "Rewrites AI-generated text into natural human prose." },
  { title: "DevFolio", href: "https://codehubx.tech", lang: "JavaScript", stack: "React · Supabase · Gemini", icon: "code", status: "live", site: "codehubx.tech", text: "AI-powered developer portfolio builder with GitHub integration." },
  { title: "K-Stream Gold", href: "https://kstream.net", lang: "JavaScript", stack: "React · Supabase · TMDB", icon: "play", status: "live", site: "kstream.net", text: "Streaming discovery for movies, TV and anime." },
];

// Public repos. Language and stars come from the API; a name that no longer exists fails the run.
const ROWS = [
  { repo: "Streaming-URL-FInder", action: "finds video stream URLs in a page" },
  { repo: "Ultimate-Proxy-Scraper", action: "regex proxy harvester" },
  { repo: "membrain-mcp", action: "npm i -g membrain-mcp" },
  { repo: "devfolio", action: "portfolio builder" },
];
const CHIPS = ["MD-Viewer", "OpenJWT", "Visual-TOTP-Simulator", "ProxyTool", "LiLNotes", "passwordGenerator", "Learning-Skill-Tracks", "CareerPath"];

const NOTE = "Most of the work is private: client storefronts, Android apps, licensing systems, admin panels.";
const CONTACT = [
  { label: "devlune.in", href: "https://devlune.in", accent: true },
  { label: "sidharth69.in", href: "https://sidharth69.in" },
  { label: "in/sidharth69", href: "https://www.linkedin.com/in/sidharth69/" },
  { label: "sidharth@devlune.in", href: "mailto:sidharth@devlune.in" },
  { label: "@dev.lune", href: "https://instagram.com/dev.lune" },
];

const LANG_COLORS = {
  TypeScript: "#3178C6", JavaScript: "#F1E05A", HTML: "#E34C26", CSS: "#663399", Python: "#3572A5", Kotlin: "#A97BFF",
  Rust: "#DEA584", Go: "#00ADD8", Java: "#B07219", Shell: "#89E051", "Jupyter Notebook": "#DA5B0B", "C#": "#178600",
  "C++": "#F34B7D", C: "#555555", Dart: "#00B4AB", PHP: "#4F5D95", Vue: "#41B883", Svelte: "#FF3E00", Swift: "#F05138",
};

// 120x120 line icons, drawn faint behind a card's top-right corner.
const ICONS = {
  code: "M14,26h92v68h-92ZM14,44h92M40,80l-14,-12l14,-12M80,80l14,-12l-14,-12M54,84l12,-32",
  db: "M22,32c0,-8 17,-14 38,-14s38,6 38,14s-17,14 -38,14s-38,-6 -38,-14ZM22,32v28c0,8 17,14 38,14s38,-6 38,-14v-28M22,60v28c0,8 17,14 38,14s38,-6 38,-14v-28",
  cart: "M12,24h16l12,52h52l10,-36h-68M48,94a5,5 0 1 0 0.1,0M86,94a5,5 0 1 0 0.1,0",
  phone: "M42,12h36a6,6 0 0 1 6,6v84a6,6 0 0 1 -6,6h-36a6,6 0 0 1 -6,-6v-84a6,6 0 0 1 6,-6ZM52,24h16M56,98h8",
  monitor: "M14,22h92v60h-92ZM44,102h32M60,82v20M26,56h14l8,-16l12,30l8,-14h26",
  chart: "M16,100h92M28,100v-36M50,100v-60M72,100v-44M94,100v-76",
  play: "M14,26h92v68h-92ZM50,44v32l28,-16Z",
  text: "M20,30h80M20,50h80M20,70h56M20,90h68",
};

// ---------------------------------------------------------------- helpers

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FONT = readFileSync(`${ROOT}scripts/JetBrainsMono-latin.woff2`).toString("base64");
const STYLE = `<style>@font-face{font-family:'JetBrains Mono';font-style:normal;font-weight:100 800;src:url(data:font/woff2;base64,${FONT}) format('woff2')}text{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre}</style>`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const n2 = (v) => +v.toFixed(2);
const tw = (s, size) => s.length * size * 0.6; // JetBrains Mono advance is 600/1000 em
const mix = (a, b, k) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("");

const svg = (w, h, label, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">\n<title>${esc(label)}</title>\n${STYLE}\n${body}\n</svg>\n`;

// Section heading: title left, note right, accent rule fading out underneath.
const head = (t, title, note) =>
  `<text x="22" y="28" fill="${t.ink}" font-size="16" font-weight="600" letter-spacing="1.5">${esc(title.toUpperCase())}</text>` +
  `<text x="818" y="28" fill="${t.sub}" font-size="11.5" text-anchor="end">${esc(note)}</text>` +
  `<defs><linearGradient id="rule" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.accent}" stop-opacity=".9"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></linearGradient></defs>` +
  `<rect x="0" y="40" width="840" height="1" fill="url(#rule)"/>`;

// Drawn, not typed: the star glyph is outside the embedded latin subset.
const star = (cx, cy, r, fill) => {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const R = i % 2 ? r * 0.45 : r;
    p.push(`${n2(cx + R * Math.cos(a))},${n2(cy + R * Math.sin(a))}`);
  }
  return `<polygon points="${p.join(" ")}" fill="${fill}"/>`;
};

const wrap = (text, max) => {
  const lines = [""];
  for (const word of text.split(" ")) {
    const cur = lines[lines.length - 1];
    if (cur && cur.length + 1 + word.length > max) lines.push(word);
    else lines[lines.length - 1] = cur ? `${cur} ${word}` : word;
  }
  return lines;
};

const mulberry32 = (a) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let x = Math.imul(a ^ (a >>> 15), 1 | a);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};

// ---------------------------------------------------------------- graphics

function net(t, d) {
  const W = 840, H = 480, rnd = mulberry32(7);
  const repos = [...d.repos].sort((a, b) => b.stargazers_count - a.stargazers_count || b.pushed_at.localeCompare(a.pushed_at));

  // Best-candidate sampling gives an even scatter; the most-starred repos take the central points.
  const pts = [{ x: W / 2, y: 262 }];
  while (pts.length < repos.length) {
    let best, bd = -1;
    for (let k = 0; k < 60; k++) {
      const c = { x: 70 + rnd() * (W - 140), y: 112 + rnd() * 300 };
      const dd = Math.min(...pts.map((p) => Math.hypot(p.x - c.x, p.y - c.y)));
      if (dd > bd) { bd = dd; best = c; }
    }
    pts.push(best);
  }
  const fromCentre = (p) => Math.hypot((p.x - W / 2) * 0.55, p.y - 262);
  pts.sort((a, b) => fromCentre(a) - fromCentre(b));
  const month = Date.now() - 30 * 864e5;
  const nodes = repos.map((r, i) => ({ ...pts[i], name: r.name, stars: r.stargazers_count, recent: Date.parse(r.pushed_at) > month, r: n2(4 + Math.sqrt(r.stargazers_count) * 1.8) }));

  const edges = new Map();
  nodes.forEach((a, i) => {
    nodes.map((b, j) => [Math.hypot(a.x - b.x, a.y - b.y), j]).filter(([, j]) => j !== i).sort((p, q) => p[0] - q[0]).slice(0, 2)
      .forEach(([, j]) => edges.set(`${Math.min(i, j)}-${Math.max(i, j)}`, [nodes[Math.min(i, j)], nodes[Math.max(i, j)]]));
  });

  let lines = "", pulses = "";
  [...edges.values()].forEach(([a, b], e) => {
    lines += `<path id="e${e}" d="M${n2(a.x)},${n2(a.y)}L${n2(b.x)},${n2(b.y)}" fill="none"/>`;
    if (e % 2) return;
    const dur = n2(3.5 + rnd() * 1.5), begin = n2(-rnd() * 4);
    pulses += `<circle r="2" fill="${t.accent}" opacity="0"><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>` +
      `<animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite"><mpath href="#e${e}" xlink:href="#e${e}"/></animateMotion></circle>`;
  });

  let dots = "", labels = "";
  nodes.forEach((n, i) => {
    const at = `cx="${n2(n.x)}" cy="${n2(n.y)}"`;
    if (n.recent) {
      dots += `<circle ${at} r="${n.r}" fill="none" stroke="${t.accent}" stroke-width="1.5"><animate attributeName="r" values="${n.r};${n.r + 10}" dur="2.4s" begin="${n2(i * 0.13)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.75;0" dur="2.4s" begin="${n2(i * 0.13)}s" repeatCount="indefinite"/></circle>` +
        `<circle ${at} r="${n.r}" fill="${t.accent}"/>`;
    } else if (n.stars) dots += `<circle ${at} r="${n.r}" fill="${t.line}" stroke="${t.accent}" stroke-width="1.5"/>`;
    else dots += `<circle ${at} r="${n.r}" fill="${t.bg}" stroke="${t.sub}" stroke-width="1.5" opacity="0.55"/>`;
  });
  // Each label tries right, left, below, above and keeps the spot that covers the fewest labels and nodes.
  const placed = [];
  nodes.filter((n) => n.stars).slice(0, 6).forEach((n) => {
    const count = String(n.stars), w = tw(n.name, 13) + tw(count, 10) + 24, gap = n.r + 8;
    const spots = [[n.x + gap, n.y - 8], [n.x - gap - w, n.y - 8], [n.x - w / 2, n.y + gap], [n.x - w / 2, n.y - gap - 17]];
    const cost = ([x, y]) =>
      (x < 20 || x + w > W - 20 ? 1000 : 0) +
      placed.filter((q) => x < q.x + q.w + 4 && q.x < x + w + 4 && y < q.y + 21 && q.y < y + 21).length * 100 +
      nodes.filter((m) => m !== n && m.x > x - m.r && m.x < x + w + m.r && m.y > y - m.r && m.y < y + 17 + m.r).length;
    const [x, y] = spots.reduce((best, s) => (cost(s) < cost(best) ? s : best));
    placed.push({ x, y, w });
    const sx = x + 5 + tw(n.name, 13) + 8;
    labels += `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="17" fill="${t.bg}" rx="3" opacity="0.88"/>` +
      `<text x="${n2(x + 5)}" y="${n2(y + 12)}" fill="${t.ink}" font-size="13">${esc(n.name)}</text>` +
      star(sx, y + 8, 4.5, t.accent) + `<text x="${n2(sx + 7)}" y="${n2(y + 12)}" fill="${t.accent}" font-size="10">${count}</text>`;
  });

  const corner = (p) => `<path d="${p}" fill="none" stroke="${t.accent}" stroke-width="2"/>`;
  const stats = `${repos.length} projects · ${d.stars} stars · ${d.followers} followers · ${d.years} years`;
  return svg(W, H, `${NAME} (@${USER}): ${stats}`,
    `<defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${t.grid}" stroke-width="1"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#g)"/>` +
    corner("M14 30V14H30") + corner("M826 30V14h-16") + corner("M14 450v16h16") + corner("M826 450v16h-16") +
    `<text x="22" y="40" fill="${t.ink}" font-size="19" font-weight="600" letter-spacing="1">${esc(NAME)}</text>` +
    `<text x="${n2(22 + tw(NAME, 19) + NAME.length + 10)}" y="40" fill="${t.accent}" font-size="13">@${USER}</text>` +
    `<text x="22" y="62" fill="${t.dim}" font-size="12">${esc(TAGLINE)}</text>` +
    `<defs><linearGradient id="rule" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.accent}" stop-opacity=".9"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></linearGradient></defs><rect x="0" y="76" width="${W}" height="1" fill="url(#rule)"/>` +
    `<g stroke="${t.line}" stroke-width="1">${lines}</g>${pulses}${dots}${labels}` +
    `<circle cx="25" cy="450" r="2.5" fill="${t.accent}"/><text x="36" y="454" fill="${t.sub}" font-size="11.5">pushed in the last month</text>` +
    `<text x="818" y="454" fill="${t.sub}" font-size="11.5" text-anchor="end">${esc(stats)}</text>`);
}

function tiles(t, items) {
  const w = (840 - 8 * (items.length - 1)) / items.length;
  const body = items.map((it, i) => {
    const x = n2(i * (w + 8)), mid = n2(i * (w + 8) + w / 2), c = i % 2 ? t.accent : t.ink;
    return `<rect x="${x}" y="0.5" width="${n2(w)}" height="91" fill="${t.bg}" rx="6" stroke="${t.line}"/><rect x="${x}" y="0.5" width="3" height="91" fill="${i % 2 ? t.accent : t.line}"/>` +
      `<text x="${mid}" y="46" fill="${c}" font-size="24" font-weight="600" text-anchor="middle">${esc(it.v)}</text>` +
      `<text x="${mid}" y="68" fill="${t.dim}" font-size="9.5" letter-spacing="1.2" text-anchor="middle">${esc(it.label)}</text>`;
  }).join("");
  return svg(840, 92, items.map((it) => `${it.v} ${it.label.toLowerCase()}`).join(", "), body);
}

function heat(t, cal) {
  const levels = [t.cell, mix(t.cell, t.accent, 0.3), mix(t.cell, t.accent, 0.55), mix(t.cell, t.accent, 0.78), t.accent];
  const rank = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
  const months = [];
  let cols = "", last = -1;
  cal.weeks.forEach((wk, i) => {
    const x = 48 + i * 14, m = new Date(wk.contributionDays[0].date).getUTCMonth();
    if (m !== last) {
      if (months.length && x - months[months.length - 1].x < 28) months.pop(); // a sliver of a month at the left edge
      months.push({ x, m });
      last = m;
    }
    const d = i * 0.01; // hold at 0 then fade, so late columns never flash before their turn
    cols += `<g opacity="1"><animate attributeName="opacity" values="0;0;1" keyTimes="0;${n2(d / (d + 0.5))};1" dur="${n2(d + 0.5)}s" fill="freeze"/>` +
      wk.contributionDays.map((day) => `<rect x="${x}" y="${78 + day.weekday * 14}" width="11" height="11" rx="2" fill="${levels[rank[day.contributionLevel]]}"/>`).join("") + `</g>`;
  });
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const right = 48 + cal.weeks.length * 14 - 3;
  const legend = levels.map((c, i) => `<rect x="${right - 38 - (4 - i) * 14 - 11}" y="189" width="11" height="11" rx="2" fill="${c}"/>`).join("");
  return svg(840, 219, `${cal.totalContributions} contributions in the last year`,
    head(t, "Contributions", "last 12 months") +
    months.map((mo) => `<text x="${mo.x}" y="68" fill="${t.sub}" font-size="10">${names[mo.m]}</text>`).join("") +
    [["Mon", 102], ["Wed", 130], ["Fri", 158]].map(([s, y]) => `<text x="22" y="${y}" fill="${t.sub}" font-size="9.5">${s}</text>`).join("") + cols +
    `<text x="48" y="199" fill="${t.dim}" font-size="11.5"><tspan fill="${t.ink}" font-weight="600">${cal.totalContributions.toLocaleString("en-US")}</tspan> contributions</text>` +
    `<text x="${right - 38 - 5 * 14 - 5}" y="199" fill="${t.sub}" font-size="10" text-anchor="end">less</text>${legend}<text x="${right}" y="199" fill="${t.sub}" font-size="10" text-anchor="end">more</text>`);
}

function langs(t, d) {
  const total = d.langs.reduce((s, [, n]) => s + n, 0);
  let x = 0, bar = "", key = "", kx = 22;
  d.langs.forEach(([name, n], i) => {
    const w = (n / total) * 840, c = LANG_COLORS[name] || t.dim;
    bar += `<rect x="${n2(x)}" y="64" width="${n2(Math.max(w - 2, 1))}" height="26" fill="${c}" rx="2" opacity="${i ? 0.92 : 1}"/>`;
    x += w;
    const pct = `${Math.round((n / total) * 100)}%`;
    if (i < 7) {
      key += `<circle cx="${n2(kx + 4)}" cy="116" r="4" fill="${c}"/><text x="${n2(kx + 14)}" y="120" fill="${t.dim}" font-size="12">${esc(name)}</text>` +
        `<text x="${n2(kx + 14 + tw(name, 12) + 7)}" y="120" fill="${t.ink}" font-size="12">${pct}</text>`;
      kx += 14 + tw(name, 12) + 7 + tw(pct, 12) + 26;
    }
  });
  return svg(840, 142, `Languages across ${total} public repositories`,
    head(t, "Languages", `${total} public repositories, by repository`) +
    `<rect x="0" y="64" width="840" height="26" rx="6" fill="${t.bg}" stroke="${t.line}"/>` +
    `<defs><clipPath id="reveal"><rect x="0" y="64" height="26" width="840"><animate attributeName="width" values="0;840" dur="1.1s" fill="freeze" calcMode="spline" keySplines="0.22 1 0.36 1" keyTimes="0;1"/></rect></clipPath></defs>` +
    `<g clip-path="url(#reveal)">${bar}</g>${key}`);
}

const strip = (t, title, note) => svg(840, 54, title, head(t, title, note));

function card(t, p) {
  const lines = wrap(p.text, 45).slice(0, 3);
  const y0 = 89.75 - (lines.length - 1) * 10;
  return svg(410, 164, `${p.title}: ${p.text}`,
    `<rect x="0.5" y="0.5" width="409" height="163" fill="${t.bg}" rx="6"/><defs><clipPath id="cc"><rect x="1" y="1" width="408" height="162" rx="6"/></clipPath></defs>` +
    `<g clip-path="url(#cc)"><g aria-hidden="true" transform="translate(322 16) scale(1.1)" fill="none" stroke="${t.accent}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.13"><path d="${ICONS[p.icon]}"/></g></g>` +
    `<rect x="0.5" y="0.5" width="409" height="163" rx="6" fill="none" stroke="${t.line}"/><rect x="0.5" y="0.5" width="3" height="163" fill="${t.accent}"/>` +
    `<text x="22" y="34" fill="${t.ink}" font-size="17" font-weight="600">${esc(p.title)}</text>` +
    `<circle cx="${n2(388 - tw(p.stack, 11.5) - 10)}" cy="30" r="4" fill="${LANG_COLORS[p.lang] || t.dim}"/><text x="388" y="34" fill="${t.dim}" font-size="11.5" text-anchor="end">${esc(p.stack)}</text>` +
    lines.map((l, i) => `<text x="22" y="${n2(y0 + i * 20)}" fill="${t.dim}" font-size="13.5">${esc(l)}</text>`).join("") +
    `<rect x="22" y="128" width="366" height="1" fill="${t.line}"/><circle cx="25" cy="144" r="3" fill="${t.accent}"/>` +
    `<text x="35" y="148" fill="${t.accent}" font-size="12">${esc(p.status)}</text><text x="388" y="148" fill="${t.sub}" font-size="12" text-anchor="end">${esc(p.site)}</text>`);
}

const row = (t, r) => svg(840, 46, `${r.title}: ${r.meta}, ${r.action}`,
  `<rect x="0" y="0.5" width="840" height="45" fill="${t.bg}" rx="6" stroke="${t.line}"/><rect x="0" y="0.5" width="3" height="45" fill="${t.accent}"/>` +
  `<text x="22" y="29" fill="${t.ink}" font-size="14" font-weight="600">${esc(r.title)}</text>` +
  `<text x="${n2(22 + tw(r.title, 14) + 14)}" y="29" fill="${t.dim}" font-size="12.5">${esc(r.meta)}</text>` +
  `<text x="818" y="29" fill="${t.accent}" font-size="12.5" text-anchor="end">${esc(r.action)}</text>`);

function chip(t, label, accent) {
  const w = Math.ceil(tw(label, 12) + 28);
  return svg(w, 30, label, `<rect x="0.5" y="0.5" width="${w - 1}" height="29" fill="${t.bg}" rx="15" stroke="${accent ? t.accent : t.line}"/>` +
    `<text x="${w / 2}" y="19.5" fill="${accent ? t.accent : t.dim}" font-size="12" text-anchor="middle">${esc(label)}</text>`);
}

const note = (t, text) => svg(840, 34, text, `<text x="420" y="21" fill="${t.sub}" font-size="12" text-anchor="middle">${esc(text)}</text>`);

// ---------------------------------------------------------------- data

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!TOKEN) throw new Error("Set GITHUB_TOKEN. Locally: GITHUB_TOKEN=$(gh auth token) node scripts/gfx.mjs");

async function gh(path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${TOKEN}`, accept: "application/vnd.github+json", "user-agent": USER },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function load() {
  const user = await gh(`/users/${USER}`);
  const all = [];
  for (let page = 1; ; page++) {
    const batch = await gh(`/users/${USER}/repos?per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  const repos = all.filter((r) => !r.fork && r.name !== USER);
  const q = await gh("/graphql", { query: `{user(login:"${USER}"){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date weekday contributionLevel}}}}}}` });
  if (q.errors) throw new Error(JSON.stringify(q.errors));
  const count = {};
  for (const r of repos) if (r.language) count[r.language] = (count[r.language] || 0) + 1;
  return {
    repos,
    followers: user.followers,
    stars: repos.reduce((s, r) => s + r.stargazers_count, 0),
    years: Math.floor((Date.now() - Date.parse(user.created_at)) / 31557600000),
    langs: Object.entries(count).sort((a, b) => b[1] - a[1]),
    cal: q.data.user.contributionsCollection.contributionCalendar,
  };
}

// ---------------------------------------------------------------- output

const d = await load();
const repo = (name) => {
  const r = d.repos.find((x) => x.name === name);
  if (!r) throw new Error(`"${name}" is in the config but is not a public, non-fork repo of ${USER}`);
  return r;
};
const rows = ROWS.map((r) => {
  const g = repo(r.repo);
  return { title: g.name, href: g.html_url, action: r.action, meta: [g.language, `${g.stargazers_count} ${g.stargazers_count === 1 ? "star" : "stars"}`].filter(Boolean).join(" · ") };
});
const chips = CHIPS.map((name) => ({ label: name, href: repo(name).html_url }));
const STRIPS = [["Selected work", `${PRODUCTS.length} products, one author`], ["Open source", "public repositories"], ["Elsewhere", "smaller repositories"]];

mkdirSync(`${ROOT}dist/gfx`, { recursive: true });
const written = new Set();
const emit = (name, draw) => {
  for (const [suffix, t] of Object.entries(THEMES)) writeFileSync(`${ROOT}dist/gfx/${name}${suffix}.svg`, draw(t));
  written.add(name);
};

emit("net", (t) => net(t, d));
emit("tiles", (t) => tiles(t, [
  { v: d.repos.length, label: "PUBLIC PROJECTS" }, { v: d.stars, label: "STARS EARNED" }, { v: d.followers, label: "FOLLOWERS" },
  { v: PRODUCTS.length, label: "PRODUCTS SHIPPED" }, { v: `${d.years}y`, label: "ON GITHUB" },
]));
emit("heat", (t) => heat(t, d.cal));
emit("langs", (t) => langs(t, d));
for (const [title, sub] of STRIPS) emit(`strip-${slug(title)}`, (t) => strip(t, title, sub));
for (const p of PRODUCTS) emit(`card-${slug(p.title)}`, (t) => card(t, p));
for (const r of rows) emit(`row-${slug(r.title)}`, (t) => row(t, r));
for (const c of [...chips, ...CONTACT, { label: "all repositories", accent: true }]) emit(`chip-${slug(c.label)}`, (t) => chip(t, c.label, c.accent));
emit("note", (t) => note(t, NOTE));

function readme(base) {
  const pic = (name, alt, width) => {
    if (!written.has(name)) throw new Error(`README references ${name}.svg, which was never rendered`);
    return `<picture><source media="(prefers-color-scheme: light)" srcset="${base}${name}-light.svg" /><img src="${base}${name}.svg" alt="${esc(alt)}"${width ? ` width="${width}"` : ""} /></picture>`;
  };
  const a = (href, inner) => `<a href="${esc(href)}">${inner}</a>`;
  const p = (...lines) => `<p align="center">\n${lines.flat().join("\n")}\n</p>`;
  const stripPic = ([title]) => pic(`strip-${slug(title)}`, title, "100%");
  return [
    p(pic("net", `${NAME} (@${USER}): every public project as a mesh, sized by stars, wired to its nearest neighbours`, "100%"),
      pic("tiles", "Public projects, stars earned, followers, products shipped, years on GitHub", "100%"),
      pic("heat", "Contribution calendar for the last twelve months", "100%"),
      pic("langs", "Language distribution across public repositories", "100%")),
    p(stripPic(STRIPS[0]), PRODUCTS.map((x) => a(x.href, pic(`card-${slug(x.title)}`, `${x.title}: ${x.text}`, "49%")))),
    p(stripPic(STRIPS[1]), rows.map((r) => a(r.href, pic(`row-${slug(r.title)}`, `${r.title}: ${r.meta}, ${r.action}`, "100%")))),
    p(stripPic(STRIPS[2]), chips.map((c) => a(c.href, pic(`chip-${slug(c.label)}`, c.label))),
      a(`https://github.com/${USER}?tab=repositories`, pic("chip-all-repositories", "All repositories"))),
    p(pic("note", NOTE, "100%"), CONTACT.map((c) => a(c.href, pic(`chip-${slug(c.label)}`, c.label)))),
  ].join("\n\n");
}

writeFileSync(`${ROOT}README.md`, `<!-- Generated by scripts/gfx.mjs. Edit the config there and re-run; do not edit this file by hand. -->\n\n${readme(RAW)}\n`);
writeFileSync(`${ROOT}dist/preview.html`,
  `<!doctype html><meta charset="utf-8"><title>README preview</title><style>body{margin:0;background:#0d1117}main{max-width:846px;margin:32px auto;padding:0 16px}img{max-width:100%}@media(prefers-color-scheme:light){body{background:#fff}}</style><main>${readme("gfx/")}</main>\n`);
console.log(`${written.size * 2} graphics -> dist/gfx, README.md, dist/preview.html`);
