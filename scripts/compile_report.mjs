#!/usr/bin/env node
// compile_report.mjs - builds a standalone HTML report from reddit_extract.mjs output
//
// Usage:
//   node scripts/compile_report.mjs ~/Desktop/reddit-research --open
//   node scripts/compile_report.mjs ~/Desktop/reddit-research --output report.html

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h") || args.length === 0) {
  console.error(`Usage: node scripts/compile_report.mjs <research-dir> [options]

Generates:
  index.html   Standalone Reddit research report
  results.csv  Theme and post summary spreadsheet

Options:
  --output <path>  HTML output path (default: <research-dir>/index.html)
  --open           Open the report in your browser after generation
  --help, -h       Show this help message

Expected input from reddit_extract.mjs:
  <research-dir>/raw/index.json
  <research-dir>/raw/*.md
  <research-dir>/themes/*.md`);
  process.exit(args.includes("--help") || args.includes("-h") ? 0 : 1);
}

const researchDir = resolve(args[0]);
const shouldOpen = args.includes("--open");
const outputIdx = args.indexOf("--output");
const htmlOutputPath = resolve(outputIdx !== -1 ? args[outputIdx + 1] : join(researchDir, "index.html"));
const csvOutputPath = join(researchDir, "results.csv");
const rawDir = join(researchDir, "raw");
const themesDir = join(researchDir, "themes");
const indexJsonPath = join(rawDir, "index.json");

if (!existsSync(researchDir)) fail(`Research directory not found: ${researchDir}`);
if (!existsSync(indexJsonPath)) fail(`Missing ${indexJsonPath}. Run scripts/reddit_extract.mjs first.`);

const index = readJson(indexJsonPath);
const posts = readPosts(rawDir);
const themes = readThemes(themesDir);
const generatedAt = index.generatedAt ? new Date(index.generatedAt) : new Date();
const topic = index.topic || titleFromDir(researchDir);

// Read skill output files
try {
  index.churnSignals = readJson(join(researchDir, "churn_signals.json"));
} catch { index.churnSignals = null; }
try {
  index.competitors = readJson(join(researchDir, "competitor_matrix.json"));
} catch { index.competitors = null; }
try {
  index.personas = readJson(join(researchDir, "personas.json"));
} catch { index.personas = null; }
try {
  index.sentiment = readJson(join(researchDir, "sentiment.json"));
} catch { index.sentiment = null; }
try {
  index.featureRequests = readJson(join(researchDir, "feature_requests.json"));
} catch { index.featureRequests = null; }
try {
  index.evidenceQuality = readJson(join(researchDir, "evidence_quality.json"));
} catch { index.evidenceQuality = null; }
try {
  index.landingCopy = readJson(join(researchDir, "landing_page_copy.json"));
} catch { index.landingCopy = null; }
try {
  index.founder = readJson(join(researchDir, "founder_summary.json"));
} catch { index.founder = null; }

themes.sort((a, b) => b.mentionCount - a.mentionCount || a.theme.localeCompare(b.theme));
posts.sort((a, b) => b.score - a.score || b.upvotes - a.upvotes);

mkdirSync(dirname(htmlOutputPath), { recursive: true });
writeFileSync(htmlOutputPath, renderHtml({ index, posts, themes, topic, generatedAt }), "utf8");
writeFileSync(csvOutputPath, renderCsv({ themes, posts }), "utf8");

console.error(JSON.stringify({
  topic,
  themes: themes.length,
  posts: posts.length,
  files_generated: {
    html: htmlOutputPath,
    csv: csvOutputPath,
  },
}, null, 2));
console.log(htmlOutputPath);

if (shouldOpen) openFile(htmlOutputPath);

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    return null;
  }
}

function titleFromDir(dir) {
  return basename(dir)
    .replace(/[_-]+/g, " ")
    .replace(/\breddit\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase()) || "Reddit Research";
}

function readPosts(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(file => file.endsWith(".md"))
    .sort()
    .map(file => parsePostMarkdown(join(dir, file), file))
    .filter(Boolean);
}

function parsePostMarkdown(path, file) {
  const md = readFileSync(path, "utf8");
  const title = firstMatch(md, /^#\s+(.+)$/m) || file.replace(/\.md$/, "");
  const url = firstMatch(md, /^\*\*URL\*\*:\s+(.+)$/m);
  const subreddit = firstMatch(md, /^\*\*Subreddit\*\*:\s+r\/(.+)$/m);
  const metricsLine = firstMatch(md, /^\*\*Upvotes\*\*:\s+(.+)$/m) || "";
  const upvotes = numberFrom(firstMatch(metricsLine, /^([^|]+)/));
  const commentCount = numberFrom(firstMatch(metricsLine, /\*\*Comments\*\*:\s+([^|]+)/));
  const score = numberFrom(firstMatch(metricsLine, /\*\*Score\*\*:\s+(.+)$/));
  const body = section(md, "Post Body").replace(/\(no body text\)/, "").trim();
  const highSignalCount = numberFrom(firstMatch(md, /^## High Signal Comments \((\d+)\)/m));
  const flaggedCount = numberFrom(firstMatch(md, /^## All Flagged Comments \((\d+)\)/m));
  const quotes = [...md.matchAll(/^>\s+(.+)$/gm)].map(match => match[1].trim()).filter(Boolean);

  return {
    title,
    url,
    subreddit,
    upvotes,
    commentCount,
    score,
    body,
    highSignalCount,
    flaggedCount,
    quotes,
    file,
  };
}

function readThemes(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(file => file.endsWith(".md"))
    .sort()
    .map(file => parseThemeMarkdown(join(dir, file), file))
    .filter(Boolean);
}

function parseThemeMarkdown(path, file) {
  const md = readFileSync(path, "utf8");
  const frontmatter = parseFrontmatter(md);
  const theme = frontmatter.theme || file.replace(/\.md$/, "").toUpperCase();
  const mentionCount = numberFrom(frontmatter.mention_count) || countMatches(md, /^##\s+/gm);
  const entries = [];
  const blocks = md.split(/^---\s*$/m).slice(1).join("---").split(/^##\s+/m).slice(1);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const title = (lines.shift() || "").trim();
    const text = lines.join("\n");
    const url = firstMatch(text, /^-\s+\*\*URL\*\*:\s+(.+)$/m);
    const matched = (firstMatch(text, /^-\s+\*\*Matched\*\*:\s+(.+)$/m) || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    const quotes = [...text.matchAll(/^>\s+"?([\s\S]*?)"?$/gm)]
      .map(match => match[1].trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
    if (title || url || quotes.length) entries.push({ title, url, matched, quotes });
  }

  return { theme, mentionCount, entries, file };
}

function parseFrontmatter(md) {
  const match = md.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  return Object.fromEntries(match[1].split("\n").map(line => {
    const idx = line.indexOf(":");
    if (idx === -1) return null;
    return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^["']|["']$/g, "")];
  }).filter(Boolean));
}

function section(md, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = md.match(new RegExp(`^## ${escaped}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, "m"));
  return match ? match[1].trim() : "";
}

function firstMatch(text, regex) {
  const match = String(text || "").match(regex);
  return match ? match[1].trim() : "";
}

function numberFrom(value) {
  const match = String(value || "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function countMatches(text, regex) {
  return [...String(text || "").matchAll(regex)].length;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function externalLink(url, label = url) {
  if (!url) return "";
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function themeLabel(theme) {
  return String(theme || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function signalClass(count) {
  if (count >= 10) return "high";
  if (count >= 4) return "medium";
  return "low";
}

function percent(value, total) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function renderHtml({ index, posts, themes, topic, generatedAt }) {
  const totalPosts = index.totalPosts || posts.length;
  const totalComments = index.totalComments || posts.reduce((sum, post) => sum + post.commentCount, 0);
  const totalFlagged = index.totalFlaggedComments || posts.reduce((sum, post) => sum + post.flaggedCount, 0);
  const subreddits = index.subreddits || [...new Set(posts.map(post => post.subreddit).filter(Boolean))];
  const maxMentions = Math.max(...themes.map(theme => theme.mentionCount), 1);
  const topPosts = posts.slice(0, 12);
  const topOpportunities = index.topOpportunities || [];
  const topPainPoints = index.topPainPoints || [];

  const themeCards = themes.map(theme => {
    const mentions = theme.entries.slice(0, 4);
    const sourceCount = new Set(theme.entries.map(entry => entry.url).filter(Boolean)).size;
    return `<article class="theme-card">
      <div class="theme-head">
        <div>
          <h2>${escapeHtml(themeLabel(theme.theme))}</h2>
          <p>${theme.mentionCount} mentions${sourceCount ? ` across ${sourceCount} sources` : ""}</p>
        </div>
      </div>
      <div class="bar"><span style="width:${percent(theme.mentionCount, maxMentions)}%"></span></div>
      ${mentions.length ? `<div class="mentions">${mentions.map(renderThemeMention).join("")}</div>` : ""}
    </article>`;
  }).join("\n");

  const postRows = topPosts.map(post => `<tr>
    <td><span class="score">${escapeHtml(post.score.toFixed ? post.score.toFixed(1) : String(post.score || "0"))}</span></td>
    <td>${externalLink(post.url, post.title)}<div class="muted">r/${escapeHtml(post.subreddit || "unknown")}</div></td>
    <td>${escapeHtml(String(post.upvotes))}</td>
    <td>${escapeHtml(String(post.commentCount))}</td>
    <td>${escapeHtml(String(post.highSignalCount || 0))}</td>
  </tr>`).join("\n");

  const opportunityItems = topOpportunities.map(item => `<li>${externalLink(item.url, item.title)}${item.score ? `<span>${escapeHtml(Number(item.score).toFixed(1))}</span>` : ""}</li>`).join("");
  const painItems = topPainPoints.map(item => `<li>${externalLink(item.url, item.title)}</li>`).join("");

  // Skill card item definitions
  const churnItemsList = (index.churnSignals || []).slice(0, 5).map(c => 
    `<li>${externalLink(c.postUrl, c.postTitle || "Post")}<div class="muted">${escapeHtml(c.excerpt || "")}</div></li>`).join("");
  const churnItems = churnItemsList ? `<ul>${churnItemsList}</ul>` : "";
  const competitorItemsList = (index.competitors || []).slice(0, 5).map(c =>
    `<li>${c.direction === "FROM" ? "← " : "→ "} <strong>${escapeHtml(c.name)}</strong> <span class="muted">(${c.count})</span></li>`).join("");
  const competitorItems = competitorItemsList ? `<ul>${competitorItemsList}</ul>` : "";
  const sentimentItemsList = Object.entries(index.sentiment || {}).sort((a, b) => (Array.isArray(b[1]) ? b[1].length : Number(b[1]) || 0) - (Array.isArray(a[1]) ? a[1].length : Number(a[1]) || 0)).slice(0, 5).map(([k, v]) =>
    `<li>${escapeHtml(k)} <span class="muted">${Array.isArray(v) ? v.length + ' quotes' : (typeof v === 'number' ? v + ' quotes' : (v.count || 0) + ' quotes')}</span></li>`).join("");
  const sentimentItems = sentimentItemsList ? `<ul>${sentimentItemsList}</ul>` : "";
  const evidenceItemsList = (index.evidenceQuality || []).slice(0, 5).map(e =>
    `<li>Score ${escapeHtml(String(e.score))} <span class="muted">(${e.tier})</span></li>`).join("");
  const evidenceItems = evidenceItemsList ? `<ul>${evidenceItemsList}</ul>` : "";
  const featureItemsList = (index.featureRequests || []).slice(0, 5).map(f =>
    `<li>${externalLink(f.quotes?.[0]?.url || "#", f.feature)} <span class="muted">(score: ${f.score})</span></li>`).join("");
  const featureItems = featureItemsList ? `<ul>${featureItemsList}</ul>` : "";
  const copyHeadlineItemsList = (index.landingCopy?.headlines || []).slice(0, 3).map(h =>
    `<li>"${escapeHtml(h)}"</li>`).join("");
  const copyHeadlineItems = copyHeadlineItemsList ? `<ul>${copyHeadlineItemsList}</ul>` : "";
  const founderOpportunityItemsList = (index.founder?.opportunities || []).slice(0, 3).map(o =>
    `<li>${escapeHtml(o.title)}</li>`).join("");
  const founderOpportunityItems = founderOpportunityItemsList ? `<ul>${founderOpportunityItemsList}</ul>` : "";
  const founderAntiPatternItemsList = (index.founder?.antiPatterns || []).slice(0, 3).map(a =>
    `<li>${escapeHtml(a.title)}</li>`).join("");
  const founderAntiPatternItems = founderAntiPatternItemsList ? `<ul>${founderAntiPatternItemsList}</ul>` : "";
  const founderActionItemsList = (index.founder?.actionItems || []).slice(0, 3).map(a =>
    `<li><strong>${escapeHtml(a.priority)}:</strong> ${escapeHtml(a.action)}</li>`).join("");
  const founderActionItems = founderActionItemsList ? `<ul>${founderActionItemsList}</ul>` : "";

  // Skill cards for theme grid
  const personaEntries = Object.entries(index.personas || {}).sort((a, b) => b[1].count - a[1].count);
  const personaItemsList = personaEntries.map(([k, v]) =>
    `<li>${escapeHtml(k)} <span class="muted">(${v.count} mentions)</span></li>`).join("");
  const personaItems = personaItemsList ? `<ul>${personaItemsList}</ul>` : "";
  const skillCards = [
    personaItems && `<article class="theme-card">
      <div class="theme-head"><div><h2>User Personas</h2><p>${personaEntries.length} personas</p></div></div>
      <div class="mentions">${personaItems}</div>
    </article>`,
    (index.churnSignals || []).length > 0 && `<article class="theme-card">
      <div class="theme-head"><div><h2>Churn Signals</h2><p>${churnItems.split('</li>').length - 1} items</p></div></div>
      <div class="mentions">${churnItems}</div>
    </article>`,
    (index.competitors || []).length > 0 && `<article class="theme-card">
      <div class="theme-head"><div><h2>Competitor Switches</h2><p>${competitorItems.split('</li>').length - 1} patterns</p></div></div>
      <div class="mentions">${competitorItems}</div>
    </article>`,
    sentimentItems && `<article class="theme-card">
      <div class="theme-head"><div><h2>Sentiment Breakdown</h2></div></div>
      <div class="mentions">${sentimentItems}</div>
    </article>`,
    (index.evidenceQuality || []).length > 0 && `<article class="theme-card">
      <div class="theme-head"><div><h2>Evidence Quality</h2></div></div>
      <div class="mentions">${evidenceItems}</div>
    </article>`,
    founderOpportunityItems && `<article class="theme-card">
      <div class="theme-head"><div><h2>What to Build</h2></div></div>
      <div class="mentions">${founderOpportunityItems}</div>
    </article>`,
    founderAntiPatternItems && `<article class="theme-card">
      <div class="theme-head"><div><h2>What to Avoid</h2></div></div>
      <div class="mentions">${founderAntiPatternItems}</div>
    </article>`,
  ].filter(Boolean).join("\n");

  const subredditPills = subreddits.map(sub => `<span>r/${escapeHtml(sub)}</span>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reddit Research - ${escapeHtml(topic)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0d0d0d;
    --panel: #101010;
    --panel-soft: #151515;
    --ink: #f7f7f7;
    --muted: #858585;
    --line: #282828;
    --red: #ffffff;
    --green: #ffffff;
    --amber: #bdbdbd;
    --blue: #3b8cff;
    --black: #ffffff;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: var(--ink); background: var(--bg); line-height: 1.5; }
  a { color: var(--blue); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .wrap { max-width: 1240px; margin: 0 auto; padding: 28px 20px 44px; border-left: 1px solid var(--line); border-right: 1px solid var(--line); min-height: 100vh; }
  header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 26px; padding-bottom: 24px; border-bottom: 1px solid var(--line); }
  h1 { margin: 0 0 6px; font-family: Inter, ui-sans-serif, system-ui, sans-serif; font-size: clamp(2rem, 4.6vw, 4.25rem); font-weight: 400; line-height: 1.04; letter-spacing: 0; }
  h2 { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; font-size: 1.05rem; font-weight: 600; }
  .meta, .muted { color: var(--muted); font-size: 0.88rem; }
  .subreddits { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
  .subreddits span { border: 1px solid var(--line); background: var(--panel); border-radius: 0; padding: 6px 9px; font-size: 0.76rem; color: var(--muted); text-transform: uppercase; }
  .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; margin-bottom: 24px; border-top: 1px solid var(--line); border-left: 1px solid var(--line); }
  .stat, .panel, .theme-card { background: var(--panel); border: 1px solid var(--line); border-radius: 0; }
  .stat { padding: 16px; }
  .stat { border-top: 0; border-left: 0; }
  .stat .label { color: var(--muted); font-size: 0.72rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; }
  .stat .value { margin-top: 4px; font-family: Inter, ui-sans-serif, system-ui, sans-serif; font-size: 2rem; font-weight: 500; }
  .grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.6fr); gap: 16px; align-items: start; }
  .themes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; border-top: 1px solid var(--line); border-left: 1px solid var(--line); }
  .theme-card { padding: 16px; min-height: 180px; }
  .theme-card { border-top: 0; border-left: 0; }
  .theme-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
  .theme-head p { margin: 4px 0 0; color: var(--muted); font-size: 0.86rem; }
  .score { display: inline-flex; align-items: center; justify-content: center; border-radius: 0; min-width: 34px; padding: 3px 9px; font-weight: 600; font-size: 0.82rem; border: 1px solid var(--line); }
  .score { color: var(--ink); background: var(--panel-soft); border-color: var(--line); }
  .bar { height: 6px; background: #242424; border-radius: 0; overflow: hidden; margin: 14px 0; }
  .bar span { display: block; height: 100%; background: var(--black); border-radius: 0; min-width: 4px; }
  .mentions { display: block; }
  .mentions ul { list-style: none; padding: 0; margin: 0; }
  .mentions li { padding: 9px 0; border-top: 1px solid var(--line); font-size: 0.88rem; }
  .mentions li:first-child { border-top: 0; }
  .mention { padding-left: 12px; border-left: 1px solid var(--line); }
  .mention-title { display: block; font-size: 0.86rem; font-weight: 650; line-height: 1.35; }
  .mention-keywords { margin-top: 4px; color: var(--muted); font-size: 0.76rem; }
  .mention-quote { margin-top: 6px; color: var(--ink); font-size: 0.88rem; }
  blockquote { margin: 10px 0 0; padding-left: 12px; border-left: 1px solid var(--line); color: var(--ink); font-size: 0.9rem; }
  cite { display: block; margin-top: 6px; font-style: normal; font-size: 0.78rem; }
  .panel { padding: 16px; margin-bottom: 16px; }
  .panel h2 { margin-bottom: 10px; }
  .signal-list { list-style: none; padding: 0; margin: 0; }
  .signal-list li { display: flex; justify-content: space-between; gap: 10px; padding: 9px 0; border-top: 1px solid var(--line); font-size: 0.88rem; }
  .signal-list li:first-child { border-top: 0; }
  table { width: 100%; border-collapse: collapse; overflow: hidden; background: var(--panel); border: 1px solid var(--line); border-radius: 0; }
  th { text-align: left; color: var(--muted); background: var(--panel-soft); font-size: 0.72rem; letter-spacing: 0.04em; text-transform: uppercase; }
  th, td { padding: 11px 12px; border-bottom: 1px solid var(--line); vertical-align: top; font-size: 0.88rem; }
  tr:last-child td { border-bottom: 0; }
  footer { margin-top: 28px; color: var(--muted); font-size: 0.78rem; text-align: center; }
  @media (max-width: 860px) {
    header, .grid { display: block; }
    .subreddits { justify-content: flex-start; margin-top: 14px; }
    .stats, .themes { grid-template-columns: 1fr; }
    table { display: block; overflow-x: auto; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <div>
        <h1>${escapeHtml(topic)}</h1>
        <div class="meta">Reddit research report generated ${escapeHtml(generatedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}</div>
      </div>
      <div class="subreddits">${subredditPills}</div>
    </header>

    <section class="stats">
      <div class="stat"><div class="label">Posts Analyzed</div><div class="value">${escapeHtml(totalPosts)}</div></div>
      <div class="stat"><div class="label">Comments Seen</div><div class="value">${escapeHtml(totalComments)}</div></div>
      <div class="stat"><div class="label">Flagged Comments</div><div class="value">${escapeHtml(totalFlagged)}</div></div>
      <div class="stat"><div class="label">Themes Found</div><div class="value">${escapeHtml(themes.length)}</div></div>
    </section>

    <main class="grid">
      <section class="themes">
        ${themeCards}
        ${skillCards}
      </section>
       <aside>
         ${opportunityItems ? `<section class="panel"><h2>Top Opportunities</h2><ul class="signal-list">${opportunityItems}</ul></section>` : ""}
         ${painItems ? `<section class="panel"><h2>Top Pain Points</h2><ul class="signal-list">${painItems}</ul></section>` : ""}
         <section class="panel">
           <h2>Source Files</h2>
           <p class="meta">Inputs: <code>raw/index.json</code>, <code>raw/*.md</code>, <code>themes/*.md</code><br>Spreadsheet: <code>results.csv</code></p>
         </section>
       </aside>
    </main>

    <section style="margin-top:16px;">
      <table>
        <thead><tr><th>Score</th><th>Post</th><th>Upvotes</th><th>Comments</th><th>Signals</th></tr></thead>
        <tbody>${postRows || `<tr><td colspan="5">No post markdown files found.</td></tr>`}</tbody>
      </table>
    </section>
  </div>
</body>
</html>`;
}

function renderThemeMention(entry) {
  const title = entry.title || "Reddit thread";
  const quote = entry.quotes[0] || "";
  const matched = entry.matched.length ? entry.matched.join(", ") : "";
  return `<div class="mention">
    ${entry.url ? externalLink(entry.url, title).replace("<a ", '<a class="mention-title" ') : `<span class="mention-title">${escapeHtml(title)}</span>`}
    ${quote ? `<div class="mention-quote">${escapeHtml(quote)}</div>` : ""}
  </div>`;
}

function renderCsv({ themes, posts }) {
  const rows = [
    ["type", "theme", "title", "url", "subreddit", "score", "upvotes", "comments", "high_signal_comments", "matched_keywords", "quote"],
  ];

  for (const theme of themes) {
    for (const entry of theme.entries) {
      const quotes = entry.quotes.length ? entry.quotes : [""];
      for (const quote of quotes) {
        rows.push([
          "theme",
          theme.theme,
          entry.title,
          entry.url,
          "",
          "",
          "",
          "",
          "",
          entry.matched.join("; "),
          quote,
        ]);
      }
    }
  }

  for (const post of posts) {
    rows.push([
      "post",
      "",
      post.title,
      post.url,
      post.subreddit ? `r/${post.subreddit}` : "",
      post.score,
      post.upvotes,
      post.commentCount,
      post.highSignalCount,
      "",
      post.quotes[0] || post.body.slice(0, 300),
    ]);
  }

  return rows.map(row => row.map(csvEscape).join(",")).join("\n") + "\n";
}

function renderSkillPanel({ id, title, items, renderItem, buttonLabel, buttonUrl }) {
  if (!items || items.length === 0) return "";
  const itemHtml = items.slice(0, 5).map(renderItem).join("");
  const moreLink = buttonUrl ? `<a href="${escapeHtml(buttonUrl)}" class="signal-list li-link">${buttonLabel}</a>` : "";
  return `<section class="panel">
    <h2>${escapeHtml(title)}</h2>
    <ul class="signal-list">${itemHtml}${moreLink}</ul>
  </section>`;
}

function csvEscape(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function openFile(path) {
  const platform = process.platform;
  const command = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const commandArgs = platform === "win32" ? ["/c", "start", "", path] : [path];
  try {
    execFileSync(command, commandArgs, { stdio: "ignore" });
  } catch {
    console.error(`Could not open browser automatically. Open this file manually: ${path}`);
  }
}
