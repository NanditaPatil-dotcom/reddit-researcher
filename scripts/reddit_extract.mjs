#!/usr/bin/env node
// reddit_extract.mjs — scrapes Reddit posts and comments for a given topic
//
// Usage:
//   node scripts/reddit_extract.mjs --topic "notion alternative" --output ~/Desktop/output
//   node scripts/reddit_extract.mjs --topic "notion" --subreddits productivity,notion,apps
//   node scripts/reddit_extract.mjs --topic "notion" --limit 30 --time year
//
// What it does:
//   1. Discovers relevant subreddits (or uses ones you provide)
//   2. Searches each subreddit for high-signal posts
//   3. Extracts post body + top comments
//   4. Flags comments containing pain-point keywords
//   5. Writes raw data to output/raw/{slug}.md
//   6. Writes a summary to output/raw/index.json

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// ── Config ─────────────────────────────────────────────────────────

const PAIN_POINT_KEYWORDS = [
  "i wish", "why can't", "why cant", "so frustrating", "frustrated",
  "switched to", "switched from", "dealbreaker", "the problem is",
  "missing feature", "please add", "anyone else", "workaround",
  "hack", "broken", "slow", "expensive", "too complicated",
  "confusing", "alternative to", "hate", "annoying", "disappointed",
  "cancelled", "canceled", "refund", "waste", "useless", "terrible",
  "nightmare", "impossible", "does anyone know", "is there a way"
];

const OPPORTUNITY_KEYWORDS = [
  "does x exist", "is there a tool", "looking for", "need something",
  "wish there was", "someone should build", "would pay for",
  "would love", "dream feature", "if only"
];

const DEFAULT_SEARCH_MODIFIERS = [
  "problem", "frustrated", "wish", "alternative",
  "switched", "hate", "vs", "review"
];

// ── CLI args ────────────────────────────────────────────────────────

function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const TOPIC = getArg("topic");
const OUTPUT_DIR = getArg("output", join(homedir(), "Desktop", "reddit-research"));
const SUBREDDITS_ARG = getArg("subreddits");
const LIMIT = parseInt(getArg("limit", "40"), 10);
const TIME = getArg("time", "year"); // hour, day, week, month, year, all

if (!TOPIC) {
  console.error("ERROR: --topic is required");
  console.error("Usage: node reddit_extract.mjs --topic \"your topic\"");
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────

function slugify(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/, "");
}

function browse(...args) {
  try {
    return execFileSync("browse", args, {
      encoding: "utf-8",
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch (err) {
    return "";
  }
}

function bbSearch(query, numResults = 10) {
  try {
    const out = execFileSync(
      "bb",
      ["search", query, "--num-results", String(numResults)],
      { encoding: "utf-8", timeout: 20000 }
    );
    const data = JSON.parse(out);
    return Array.isArray(data) ? data : (data.results || []);
  } catch {
    return [];
  }
}

function containsKeywords(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.filter(k => lower.includes(k));
}

function scorePost(title, body, commentCount, upvotes) {
  const text = `${title} ${body}`.toLowerCase();
  const painMatches = containsKeywords(text, PAIN_POINT_KEYWORDS).length;
  const oppMatches = containsKeywords(text, OPPORTUNITY_KEYWORDS).length;
  // Higher score = more interesting post
  return (painMatches * 3) + (oppMatches * 5) + Math.min(commentCount / 10, 10) + Math.min(upvotes / 100, 10);
}

// ── Step 1: Subreddit Discovery ──────────────────────────────────────

async function discoverSubreddits(topic) {
  if (SUBREDDITS_ARG) {
    const manual = SUBREDDITS_ARG.split(",").map(s => s.trim().replace(/^r\//, ""));
    console.log(`Using provided subreddits: ${manual.join(", ")}`);
    return manual;
  }

  console.log(`\n[1/6] Discovering subreddits for "${topic}"...`);

  const results = bbSearch(`best subreddit for ${topic} users site:reddit.com`, 15);
  const found = new Set();

  for (const r of results) {
    // Extract r/subredditname patterns from URLs and titles
    const matches = `${r.url} ${r.title}`.matchAll(/r\/([a-zA-Z0-9_]+)/g);
    for (const m of matches) {
      const sub = m[1].toLowerCase();
      // Filter out meta/generic Reddit pages
      if (!["reddit", "all", "popular", "home", "search"].includes(sub)) {
        found.add(sub);
      }
    }
  }

  // Also do a direct search
  const direct = bbSearch(`${topic} subreddit community reddit`, 10);
  for (const r of direct) {
    const matches = `${r.url} ${r.title}`.matchAll(/r\/([a-zA-Z0-9_]+)/g);
    for (const m of matches) {
      found.add(m[1].toLowerCase());
    }
  }

  const subreddits = [...found].slice(0, 5);
  console.log(`Found subreddits: ${subreddits.join(", ")}`);
  return subreddits;
}

// ── Step 2: Post Discovery ───────────────────────────────────────────

function discoverPosts(subreddits, topic) {
  console.log(`\n[2/6] Discovering posts across ${subreddits.length} subreddits...`);

  const allPosts = [];
  const seen = new Set();

  for (const sub of subreddits) {
    console.log(`  Searching r/${sub}...`);

    // Search within subreddit
    for (const modifier of DEFAULT_SEARCH_MODIFIERS.slice(0, 4)) {
      const query = `${topic} ${modifier} site:reddit.com/r/${sub}`;
      const results = bbSearch(query, 8);

      for (const r of results) {
        if (!r.url.includes("reddit.com/r/") || seen.has(r.url)) continue;
        if (!r.url.includes("/comments/")) continue; // only actual posts

        seen.add(r.url);
        allPosts.push({
          url: r.url,
          title: r.title || "",
          subreddit: sub,
          publishedDate: r.publishedDate || null,
        });
      }
    }

    // Also search for top posts directly
    try {
      browse("env", "local");
      browse("open", `https://www.reddit.com/r/${sub}/search/?q=${encodeURIComponent(topic)}&sort=top&t=${TIME}`);
      browse("wait", "load");
      browse("wait", "timeout", "2000");
      const snapshot = browse("snapshot");

      // Extract post links from snapshot
      const postLinks = snapshot.match(/https:\/\/www\.reddit\.com\/r\/[^/]+\/comments\/[^\s"')]+/g) || [];
      for (const link of postLinks) {
        const clean = link.split("?")[0];
        if (!seen.has(clean)) {
          seen.add(clean);
          allPosts.push({ url: clean, title: "", subreddit: sub, publishedDate: null });
        }
      }
    } catch {
      // browser might not be available — that's ok
    }
  }

  console.log(`  Found ${allPosts.length} unique posts`);
  return allPosts.slice(0, LIMIT);
}

// ── Step 3: Content Extraction ───────────────────────────────────────

function extractPost(postUrl) {
  try {
    browse("open", postUrl);
    browse("wait", "load");
    browse("wait", "timeout", "1500");

    const pageText = browse("get", "text", "body");
    if (!pageText || pageText.length < 100) return null;

    // Extract title
    const titleMatch = pageText.match(/^(.+?)\n/);
    const title = titleMatch ? titleMatch[1].trim() : "";

    // Split into post body and comments (rough split)
    const lines = pageText.split("\n").map(l => l.trim()).filter(Boolean);

    // Find upvote count
    const upvoteMatch = pageText.match(/(\d+(?:,\d+)?)\s*(?:points?|upvotes?|votes?)/i);
    const upvotes = upvoteMatch ? parseInt(upvoteMatch[1].replace(",", ""), 10) : 0;

    // Find comment count
    const commentMatch = pageText.match(/(\d+)\s*comments?/i);
    const commentCount = commentMatch ? parseInt(commentMatch[1], 10) : 0;

    // Extract body text (first ~500 chars after title)
    const bodyStart = lines.findIndex(l => l.length > 50 && l !== title);
    const bodyLines = lines.slice(bodyStart, bodyStart + 10).join(" ");
    const body = bodyLines.slice(0, 600);

    // Extract comments — look for high-signal ones
    const comments = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length < 30) continue; // skip short lines

      const painKeywords = containsKeywords(line, PAIN_POINT_KEYWORDS);
      const oppKeywords = containsKeywords(line, OPPORTUNITY_KEYWORDS);

      if (painKeywords.length > 0 || oppKeywords.length > 0) {
        comments.push({
          text: line.slice(0, 400),
          painKeywords,
          oppKeywords,
          isHighSignal: painKeywords.length + oppKeywords.length >= 2,
        });
      }

      if (comments.length >= 15) break;
    }

    const score = scorePost(title, body, commentCount, upvotes);

    return {
      url: postUrl,
      title,
      body,
      upvotes,
      commentCount,
      comments,
      score,
      highSignalComments: comments.filter(c => c.isHighSignal),
    };
  } catch (err) {
    console.error(`  Failed to extract ${postUrl}: ${err.message}`);
    return null;
  }
}

// ── Step 4: Theme Detection ──────────────────────────────────────────

function detectThemes(posts) {
  const themes = {
    PRICING: [],
    PERFORMANCE: [],
    MISSING_FEATURE: [],
    UX_CONFUSION: [],
    RELIABILITY: [],
    COMPETITOR_GAP: [],
    LOVE_SIGNALS: [],
    OPPORTUNITY: [],
  };

  const themeKeywords = {
    PRICING: ["expensive", "price", "pricing", "cost", "cheap", "afford", "subscription", "free tier", "paid", "cancelled", "cancel"],
    PERFORMANCE: ["slow", "lag", "laggy", "crash", "crashes", "freeze", "hang", "fast", "speed", "performance"],
    MISSING_FEATURE: ["wish", "feature", "please add", "would love", "missing", "add support", "when will", "roadmap"],
    UX_CONFUSION: ["confusing", "complicated", "hard to", "difficult", "learning curve", "onboarding", "intuitive", "ux", "ui"],
    RELIABILITY: ["bug", "broken", "sync", "data loss", "lost my", "corrupt", "error", "unreliable", "down"],
    COMPETITOR_GAP: ["switched to", "switched from", "better than", "worse than", "compared to", "vs ", "alternative"],
    LOVE_SIGNALS: ["love", "great", "amazing", "best", "perfect", "excellent", "recommend", "worth it"],
    OPPORTUNITY: ["does anyone know", "is there a tool", "looking for", "wish there was", "would pay", "someone should"],
  };

  for (const post of posts) {
    if (!post) continue;
    const allText = `${post.title} ${post.body} ${post.comments.map(c => c.text).join(" ")}`.toLowerCase();

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      const matches = keywords.filter(k => allText.includes(k));
      if (matches.length > 0) {
        themes[theme].push({
          url: post.url,
          title: post.title,
          matchedKeywords: matches,
          highSignalComments: post.highSignalComments,
          score: post.score,
        });
      }
    }
  }

  return themes;
}

// ── Step 5: Write Output ─────────────────────────────────────────────

function writePostFile(post, outputDir) {
  const slug = slugify(post.title || post.url.split("/").slice(-2, -1)[0]);
  const filePath = join(outputDir, "raw", `${slug}.md`);

  const content = `# ${post.title}

**URL**: ${post.url}
**Upvotes**: ${post.upvotes}
**Comments**: ${post.commentCount}
**Signal Score**: ${post.score.toFixed(1)}

## Post Body
${post.body}

## High Signal Comments (${post.highSignalComments.length})
${post.highSignalComments.map(c => `
### Comment
> ${c.text}

**Pain keywords**: ${c.painKeywords.join(", ") || "none"}
**Opportunity keywords**: ${c.oppKeywords.join(", ") || "none"}
`).join("\n")}

## All Flagged Comments (${post.comments.length})
${post.comments.map(c => `- ${c.text.slice(0, 200)}`).join("\n")}
`;

  writeFileSync(filePath, content);
  return filePath;
}

function writeThemeFiles(themes, outputDir) {
  const themesDir = join(outputDir, "themes");
  mkdirSync(themesDir, { recursive: true });

  for (const [theme, posts] of Object.entries(themes)) {
    if (posts.length === 0) continue;

    const filePath = join(themesDir, `${theme.toLowerCase()}.md`);
    const content = `---
theme: ${theme}
mention_count: ${posts.length}
high_signal_count: ${posts.filter(p => p.highSignalComments && p.highSignalComments.length > 0).length}
---

# ${theme} (${posts.length} mentions)

## Posts in this theme
${posts.sort((a, b) => b.score - a.score).map(p => `
### ${p.title || "Untitled"}
- **URL**: ${p.url}
- **Matched**: ${p.matchedKeywords.join(", ")}
- **High signal comments**: ${(p.highSignalComments || []).length}

${(p.highSignalComments || []).slice(0, 3).map(c => `> "${c.text.slice(0, 300)}"`).join("\n\n")}
`).join("\n---\n")}
`;
    writeFileSync(filePath, content);
  }
}

function writeIndexJson(posts, themes, subreddits, outputDir) {
  const index = {
    topic: TOPIC,
    subreddits,
    totalPosts: posts.filter(Boolean).length,
    totalComments: posts.filter(Boolean).reduce((sum, p) => sum + p.commentCount, 0),
    totalFlaggedComments: posts.filter(Boolean).reduce((sum, p) => sum + p.comments.length, 0),
    themeBreakdown: Object.fromEntries(
      Object.entries(themes).map(([k, v]) => [k, v.length])
    ),
    topOpportunities: themes.OPPORTUNITY.slice(0, 5).map(p => ({
      title: p.title,
      url: p.url,
      score: p.score,
    })),
    topPainPoints: themes.PRICING.concat(themes.MISSING_FEATURE)
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
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Post limit: ${LIMIT} | Time range: ${TIME}\n`);

  // Create output dirs
  mkdirSync(join(OUTPUT_DIR, "raw"), { recursive: true });
  mkdirSync(join(OUTPUT_DIR, "themes"), { recursive: true });

  // Step 1: Find subreddits
  const subreddits = await discoverSubreddits(TOPIC);
  writeFileSync(join(OUTPUT_DIR, "subreddits.txt"), subreddits.join("\n"));

  // Step 2: Discover posts
  const postList = discoverPosts(subreddits, TOPIC);
  console.log(`\n[3/6] Extracting content from ${postList.length} posts...`);

  // Step 3: Extract each post
  const posts = [];
  for (let i = 0; i < postList.length; i++) {
    const p = postList[i];
    console.log(`  [${i + 1}/${postList.length}] ${p.url.slice(0, 70)}...`);
    const extracted = extractPost(p.url);
    if (extracted) {
      extracted.subreddit = p.subreddit;
      writePostFile(extracted, OUTPUT_DIR);
      posts.push(extracted);
    }
  }

  console.log(`\n[4/6] Detecting themes across ${posts.length} posts...`);

  // Step 4: Cluster themes
  const themes = detectThemes(posts);
  writeThemeFiles(themes, OUTPUT_DIR);

  console.log(`\n[5/6] Writing index and PMF signals...`);

  // Step 5: Write index
  const index = writeIndexJson(posts, themes, subreddits, OUTPUT_DIR);

  // Step 6: Print summary
  console.log(`\n[6/6] Done!\n`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  RESULTS SUMMARY`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Posts analyzed:      ${posts.length}`);
  console.log(`Subreddits searched: ${subreddits.join(", ")}`);
  console.log(`\nTheme Breakdown:`);

  for (const [theme, items] of Object.entries(themes)) {
    if (items.length > 0) {
      console.log(`  ${theme.padEnd(20)} ${items.length} mentions`);
    }
  }

  if (index.topOpportunities.length > 0) {
    console.log(`\nTop Opportunity Posts:`);
    for (const opp of index.topOpportunities) {
      console.log(`  - ${opp.title.slice(0, 60)}`);
      console.log(`    ${opp.url}`);
    }
  }

  console.log(`\nOutput saved to: ${OUTPUT_DIR}`);
  console.log(`Run compile_report.mjs next to generate the HTML report`);

  // Output JSON summary to stdout for compile_report.mjs
  console.log(JSON.stringify(index));
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
