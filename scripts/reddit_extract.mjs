#!/usr/bin/env node
// reddit_extract.mjs — scrapes Reddit using public JSON API only
// NO browser, NO bb, NO API keys needed
//
// Usage:
//   node scripts/reddit_extract.mjs --topic "notion alternative"
//   node scripts/reddit_extract.mjs --topic "notion" --subreddits productivity,notion,apps
//   node scripts/reddit_extract.mjs --topic "notion" --limit 50 --time year

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// ── Config ───────────────────────────────────────────────────────────

const PAIN_POINT_KEYWORDS = [
  "i wish", "why can't", "why cant", "so frustrating", "frustrated",
  "switched to", "switched from", "dealbreaker", "the problem is",
  "missing feature", "please add", "anyone else", "workaround",
  "hack", "broken", "slow", "expensive", "too complicated",
  "confusing", "alternative to", "hate", "annoying", "disappointed",
  "cancelled", "canceled", "refund", "useless", "terrible",
  "nightmare", "impossible", "does anyone know", "is there a way"
];

const OPPORTUNITY_KEYWORDS = [
  "does x exist", "is there a tool", "looking for",
  "wish there was", "someone should build", "would pay for",
  "would love", "dream feature", "if only", "need something that"
];

const DEFAULT_SEARCH_MODIFIERS = [
  "problem", "frustrated", "wish", "alternative",
  "switched", "hate", "review", "help"
];

const DEFAULT_SUBREDDITS = [
  "productivity", "software", "apps", "tech",
  "selfhosted", "nocode", "pkms"
];

const THEME_KEYWORDS = {
  PRICING:         ["expensive", "price", "pricing", "cost", "cheap", "afford", "subscription", "free tier", "paid", "cancelled", "cancel"],
  PERFORMANCE:     ["slow", "lag", "laggy", "crash", "crashes", "freeze", "hang", "speed", "performance"],
  MISSING_FEATURE: ["wish", "feature", "please add", "would love", "missing", "add support", "when will", "roadmap"],
  UX_CONFUSION:    ["confusing", "complicated", "hard to", "difficult", "learning curve", "onboarding", "intuitive"],
  RELIABILITY:     ["bug", "broken", "sync", "data loss", "lost my", "corrupt", "error", "unreliable", "down"],
  COMPETITOR_GAP:  ["switched to", "switched from", "better than", "worse than", "compared to", "vs ", "alternative"],
  LOVE_SIGNALS:    ["love", "great", "amazing", "best", "perfect", "excellent", "recommend", "worth it"],
  OPPORTUNITY:     ["does anyone know", "is there a tool", "looking for", "wish there was", "would pay", "someone should"],
};

// ── CLI args ─────────────────────────────────────────────────────────

function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const TOPIC          = getArg("topic");
const OUTPUT_DIR     = getArg("output", join(homedir(), "Desktop", "reddit-research"));
const SUBREDDITS_ARG = getArg("subreddits");
const LIMIT          = parseInt(getArg("limit", "40"), 10);
const TIME           = getArg("time", "year");

if (!TOPIC) {
  console.error("ERROR: --topic is required");
  console.error('Usage: node reddit_extract.mjs --topic "your topic"');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────

function slugify(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/, "");
}

function containsKeywords(text, keywords) {
  const lower = (text || "").toLowerCase();
  return keywords.filter(k => lower.includes(k));
}

function scorePost(title, body, commentCount, upvotes) {
  const text      = `${title} ${body}`.toLowerCase();
  const painCount = containsKeywords(text, PAIN_POINT_KEYWORDS).length;
  const oppCount  = containsKeywords(text, OPPORTUNITY_KEYWORDS).length;
  return (painCount * 3) + (oppCount * 5)
    + Math.min(commentCount / 10, 10)
    + Math.min(upvotes / 100, 10);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Reddit JSON API — pure fetch, zero dependencies ──────────────────

async function fetchReddit(url) {
  try {
    await sleep(500); // be polite to Reddit's servers
    const res = await fetch(url, {
      headers: {
        "User-Agent": "reddit-researcher-bot/1.0 (local research tool)",
        "Accept":     "application/json",
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function searchSubreddit(subreddit, query, time, limit = 15) {
  const url  = `https://www.reddit.com/r/${subreddit}/search.json`
             + `?q=${encodeURIComponent(query)}&sort=top&t=${time}&limit=${limit}&restrict_sr=1`;
  const data = await fetchReddit(url);
  if (!data?.data?.children) return [];
  return data.data.children
    .filter(c => c.kind === "t3" && c.data?.permalink)
    .map(c => ({
      url:          `https://www.reddit.com${c.data.permalink}`,
      permalink:    c.data.permalink,
      title:        c.data.title       || "",
      selftext:     c.data.selftext     || "",
      upvotes:      c.data.score        || 0,
      commentCount: c.data.num_comments || 0,
      subreddit:    c.data.subreddit    || subreddit,
    }));
}

async function getTopPosts(subreddit, time, limit = 10) {
  const url  = `https://www.reddit.com/r/${subreddit}/top.json?t=${time}&limit=${limit}`;
  const data = await fetchReddit(url);
  if (!data?.data?.children) return [];
  return data.data.children
    .filter(c => c.kind === "t3" && c.data?.permalink)
    .map(c => ({
      url:          `https://www.reddit.com${c.data.permalink}`,
      permalink:    c.data.permalink,
      title:        c.data.title       || "",
      selftext:     c.data.selftext     || "",
      upvotes:      c.data.score        || 0,
      commentCount: c.data.num_comments || 0,
      subreddit:    c.data.subreddit    || subreddit,
    }));
}

async function getComments(permalink) {
  const url  = `https://www.reddit.com${permalink}.json?limit=50&sort=top`;
  const data = await fetchReddit(url);
  if (!Array.isArray(data) || !data[1]) return [];
  return (data[1].data.children || [])
    .filter(c => c.kind === "t1" && c.data?.body
      && !["[deleted]", "[removed]"].includes(c.data.body))
    .map(c => ({
      text:    (c.data.body || "").slice(0, 500),
      upvotes: c.data.score || 0,
    }));
}

async function discoverSubredditsFromReddit(topic) {
  const url  = `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(topic)}&limit=10`;
  const data = await fetchReddit(url);
  const found = new Set();
  if (data?.data?.children) {
    for (const c of data.data.children) {
      const sub = c.data?.display_name?.toLowerCase();
      if (sub && !["all", "popular"].includes(sub)) found.add(sub);
    }
  }
  return [...found];
}

// ── Step 1: Subreddit Discovery ──────────────────────────────────────

async function discoverSubreddits(topic) {
  if (SUBREDDITS_ARG) {
    const manual = SUBREDDITS_ARG.split(",").map(s => s.trim().replace(/^r\//, ""));
    console.log(`Using provided subreddits: ${manual.join(", ")}`);
    return manual;
  }

  console.log(`\n[1/6] Discovering subreddits for "${topic}"...`);

  // Use Reddit's own subreddit search
  const fromReddit = await discoverSubredditsFromReddit(topic);

  // Merge with sensible defaults
  const merged = [...new Set([...fromReddit, ...DEFAULT_SUBREDDITS])].slice(0, 5);
  console.log(`Found subreddits: ${merged.join(", ")}`);
  return merged;
}

// ── Step 2: Post Discovery ───────────────────────────────────────────

async function discoverPosts(subreddits, topic) {
  console.log(`\n[2/6] Discovering posts across ${subreddits.length} subreddits...`);

  const allPosts = [];
  const seen     = new Set();

  function addPost(post) {
    const key = post.url.split("?")[0];
    if (seen.has(key)) return;
    seen.add(key);
    allPosts.push({ ...post, url: key });
  }

  for (const sub of subreddits) {
    console.log(`  Searching r/${sub}...`);

    // Direct topic search
    const direct = await searchSubreddit(sub, topic, TIME, 15);
    for (const r of direct) addPost(r);

    // Pain-point modifier searches
    for (const modifier of DEFAULT_SEARCH_MODIFIERS.slice(0, 3)) {
      const results = await searchSubreddit(sub, `${topic} ${modifier}`, TIME, 8);
      for (const r of results) addPost(r);
    }

    // Top posts that mention the topic
    const top = await getTopPosts(sub, TIME, 10);
    for (const r of top) {
      const firstWord = topic.toLowerCase().split(" ")[0];
      if (r.title.toLowerCase().includes(firstWord)) addPost(r);
    }

    console.log(`    r/${sub}: ${allPosts.length} posts so far`);
  }

  console.log(`  Total unique posts: ${allPosts.length}`);
  return allPosts.slice(0, LIMIT);
}

// ── Step 3: Content Extraction ───────────────────────────────────────

async function extractPost(post) {
  try {
    const rawComments = await getComments(post.permalink);
    const comments    = [];

    for (const c of rawComments) {
      if (c.text.length < 30) continue;
      const painKeywords = containsKeywords(c.text, PAIN_POINT_KEYWORDS);
      const oppKeywords  = containsKeywords(c.text, OPPORTUNITY_KEYWORDS);
      if (painKeywords.length > 0 || oppKeywords.length > 0) {
        comments.push({
          text:         c.text,
          upvotes:      c.upvotes,
          painKeywords,
          oppKeywords,
          isHighSignal: (painKeywords.length + oppKeywords.length) >= 2,
        });
      }
    }

    const body  = (post.selftext || "").slice(0, 600);
    const score = scorePost(post.title, body, post.commentCount, post.upvotes);

    return {
      ...post,
      body,
      comments,
      score,
      highSignalComments: comments.filter(c => c.isHighSignal),
    };
  } catch (err) {
    console.error(`  Failed: ${post.url} — ${err.message}`);
    return null;
  }
}

// ── Step 4: Theme Detection ──────────────────────────────────────────

function detectThemes(posts) {
  const themes = Object.fromEntries(Object.keys(THEME_KEYWORDS).map(k => [k, []]));

  for (const post of posts) {
    if (!post) continue;
    const allText = `${post.title} ${post.body} ${post.comments.map(c => c.text).join(" ")}`.toLowerCase();

    for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
      const matches = keywords.filter(k => allText.includes(k));
      if (matches.length > 0) {
        themes[theme].push({
          url:                post.url,
          title:              post.title,
          matchedKeywords:    matches,
          highSignalComments: post.highSignalComments,
          score:              post.score,
        });
      }
    }
  }

  return themes;
}

// ── Step 5: Write Files ──────────────────────────────────────────────

function writePostFile(post, outputDir) {
  const slug     = slugify(post.title || post.url.split("/").slice(-2, -1)[0]);
  const filePath = join(outputDir, "raw", `${slug}.md`);
  const lines    = [
    `# ${post.title}`,
    ``,
    `**URL**: ${post.url}`,
    `**Subreddit**: r/${post.subreddit}`,
    `**Upvotes**: ${post.upvotes} | **Comments**: ${post.commentCount} | **Score**: ${post.score.toFixed(1)}`,
    ``,
    `## Post Body`,
    post.body || "(no body text)",
    ``,
    `## High Signal Comments (${post.highSignalComments.length})`,
  ];

  for (const c of post.highSignalComments) {
    lines.push(``, `> ${c.text}`, ``);
    lines.push(`Pain: \`${c.painKeywords.join(", ") || "none"}\``);
    lines.push(`Opportunity: \`${c.oppKeywords.join(", ") || "none"}\``);
  }

  lines.push(``, `## All Flagged Comments (${post.comments.length})`);
  for (const c of post.comments) lines.push(`- ${c.text.slice(0, 200)}`);

  writeFileSync(filePath, lines.join("\n"));
}

function writeThemeFiles(themes, outputDir) {
  for (const [theme, posts] of Object.entries(themes)) {
    if (posts.length === 0) continue;
    const filePath = join(outputDir, "themes", `${theme.toLowerCase()}.md`);
    const lines    = [
      `---`, `theme: ${theme}`, `mention_count: ${posts.length}`, `---`,
      ``, `# ${theme} — ${posts.length} mentions`, ``,
    ];
    for (const p of posts.sort((a, b) => b.score - a.score)) {
      lines.push(`## ${p.title || "Untitled"}`);
      lines.push(`- **URL**: ${p.url}`);
      lines.push(`- **Matched**: ${p.matchedKeywords.join(", ")}`);
      lines.push(``);
      for (const c of (p.highSignalComments || []).slice(0, 3)) {
        lines.push(`> "${c.text.slice(0, 300)}"`, ``);
      }
      lines.push(`---`, ``);
    }
    writeFileSync(filePath, lines.join("\n"));
  }
}

function writeIndexJson(posts, themes, subreddits, outputDir) {
  const index = {
    topic:                TOPIC,
    subreddits,
    totalPosts:           posts.filter(Boolean).length,
    totalComments:        posts.filter(Boolean).reduce((s, p) => s + p.commentCount, 0),
    totalFlaggedComments: posts.filter(Boolean).reduce((s, p) => s + p.comments.length, 0),
    themeBreakdown:       Object.fromEntries(Object.entries(themes).map(([k, v]) => [k, v.length])),
    topOpportunities:     themes.OPPORTUNITY.slice(0, 5).map(p => ({ title: p.title, url: p.url, score: p.score })),
    topPainPoints:        [...themes.PRICING, ...themes.MISSING_FEATURE]
                            .sort((a, b) => b.score - a.score)
                            .slice(0, 10)
                            .map(p => ({ title: p.title, url: p.url })),
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(outputDir, "raw", "index.json"), JSON.stringify(index, null, 2));
  return index;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  REDDIT RESEARCHER — "${TOPIC}"`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Output : ${OUTPUT_DIR}`);
  console.log(`Limit  : ${LIMIT} posts | Time: ${TIME}`);
  console.log(`Mode   : Reddit JSON API only (no browser, no API key)\n`);

  mkdirSync(join(OUTPUT_DIR, "raw"),    { recursive: true });
  mkdirSync(join(OUTPUT_DIR, "themes"), { recursive: true });

  // Step 1 — subreddits
  const subreddits = await discoverSubreddits(TOPIC);
  writeFileSync(join(OUTPUT_DIR, "subreddits.txt"), subreddits.join("\n"));

  // Step 2 — posts
  const postList = await discoverPosts(subreddits, TOPIC);

  // Step 3 — extract
  console.log(`\n[3/6] Extracting content from ${postList.length} posts...`);
  const posts = [];
  for (let i = 0; i < postList.length; i++) {
    const p = postList[i];
    process.stdout.write(`  [${i + 1}/${postList.length}] ${p.title.slice(0, 55)}...\r`);
    const extracted = await extractPost(p);
    if (extracted) {
      writePostFile(extracted, OUTPUT_DIR);
      posts.push(extracted);
    }
  }
  console.log(`\n  Extracted ${posts.length} posts successfully`);

  // Step 4 — themes
  console.log(`\n[4/6] Detecting themes...`);
  const themes = detectThemes(posts);
  writeThemeFiles(themes, OUTPUT_DIR);

  // Step 5 — index
  console.log(`[5/6] Writing index...`);
  const index = writeIndexJson(posts, themes, subreddits, OUTPUT_DIR);

  // Step 6 — summary
  console.log(`\n[6/6] Done!\n`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  RESULTS`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Posts analyzed : ${posts.length}`);
  console.log(`Subreddits     : ${subreddits.join(", ")}`);
  console.log(`\nTheme Breakdown:`);
  for (const [theme, items] of Object.entries(themes)) {
    if (items.length > 0) console.log(`  ${theme.padEnd(20)} ${items.length} mentions`);
  }
  if (index.topOpportunities.length > 0) {
    console.log(`\nTop Opportunities:`);
    for (const o of index.topOpportunities) {
      console.log(`  - ${o.title.slice(0, 60)}`);
      console.log(`    ${o.url}`);
    }
  }
  console.log(`\nOutput: ${OUTPUT_DIR}`);
  console.log(JSON.stringify(index));
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
