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
import { execSync } from "node:child_process";

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

const GENERIC_TOPIC_WORDS = new Set([
  "alternative", "alternatives", "app", "apps", "tool", "tools",
  "software", "platform", "product", "review", "reviews"
]);

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

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

const TOPIC          = getArg("topic");
const VERBOSE        = hasFlag("verbose");
const NO_COMPILE     = hasFlag("no-compile");
const OUTPUT_DIR_ARG = getArg("output");
const SUBREDDITS_ARG = getArg("subreddits");
const LIMIT          = parseInt(getArg("limit", "40"), 10);
const TIME           = getArg("time", "year");
const REQUEST_DELAY  = parseInt(getArg("delay", "2500"), 10);
const MAX_PER_SUBREDDIT_ARG = getArg("max-per-subreddit");

if (!TOPIC) {
  console.error("ERROR: --topic is required");
  console.error('Usage: node reddit_extract.mjs --topic "your topic" [options]');
  console.error('');
  console.error('Options:');
  console.error('  --topic TEXT             Topic to research (required)');
  console.error('  --output DIR             Custom output directory');
  console.error('  --subreddits LIST        Comma-separated subreddit list');
  console.error('  --limit NUM              Max posts to process (default: 40)');
  console.error('  --time RANGE             Time window: week, month, year, all (default: year)');
  console.error('  --delay MS               Delay between requests (default: 2500)');
  console.error('  --verbose                Print detailed logging');
  console.error('  --no-compile             Skip auto-compilation to HTML');
  process.exit(1);
}

// Generate output directory name dynamically if not specified
function generateOutputDir(topic) {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const slug = slugify(topic);
  return join(homedir(), "Desktop", `${slug}_reddit_${dateStr}`);
}

const OUTPUT_DIR = OUTPUT_DIR_ARG || generateOutputDir(TOPIC);

// ── Helpers ──────────────────────────────────────────────────────────

function log(msg) {
  console.error(msg);
}

function verbose(msg) {
  if (VERBOSE) console.error(`  [verbose] ${msg}`);
}

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

function log(msg) {
  console.error(msg);
}

function verbose(msg) {
  if (VERBOSE) console.error(`  [verbose] ${msg}`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function createRedditUrl(host, pathname, params = {}) {
  const url = new URL(pathname, host);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function normalizeSearchText(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getTopicKeys(topic) {
  const words = (topic || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter(word => !GENERIC_TOPIC_WORDS.has(word));
  const fallbackWords = (topic || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const meaningfulWords = words.length > 0 ? words : fallbackWords;

  return {
    compact: meaningfulWords.join(""),
    primary: meaningfulWords.find(word => word.length >= 3) || meaningfulWords[0] || "",
  };
}

function scoreSubredditCandidate(candidate, topicKeys) {
  const name = normalizeSearchText(candidate.displayName);
  const title = normalizeSearchText(candidate.title);
  const description = normalizeSearchText(candidate.description);
  const { compact, primary } = topicKeys;

  let score = 0;
  if (compact && name === compact) score += 120;
  if (primary && name === primary) score += 100;
  if (compact && name.includes(compact)) score += 90;
  if (primary && name.includes(primary)) score += 80;
  if (compact && title.includes(compact)) score += 35;
  if (primary && title.includes(primary)) score += 25;
  if (compact && description.includes(compact)) score += 15;
  if (primary && description.includes(primary)) score += 10;
  score += Math.min(Math.log10(Math.max(candidate.subscribers, 1)), 6);

  return score;
}

function buildSearchQueries(topic) {
  const cleanedTopic = (topic || "").trim().toLowerCase();
  const words = cleanedTopic.split(/[^a-z0-9]+/).filter(word => word.length >= 3);
  const queries = new Set([cleanedTopic]);

  if (words.length > 1) {
    queries.add(words.join(" "));
    queries.add(words[0]);
    queries.add(`${words[0]} app`);
    queries.add(`${words[0]} tracking`);
  }

  for (const modifier of DEFAULT_SEARCH_MODIFIERS.slice(0, 3)) {
    queries.add(`${cleanedTopic} ${modifier}`);
  }

  return [...queries].filter(Boolean).slice(0, 7);
}

function allocatePostBudgets(candidatesBySubreddit, subreddits, totalLimit) {
  const available = subreddits
    .map(subreddit => ({
      subreddit,
      count: candidatesBySubreddit.get(subreddit)?.length || 0,
    }))
    .filter(item => item.count > 0);

  if (available.length === 0) return new Map();

  if (MAX_PER_SUBREDDIT_ARG) {
    const maxPerSubreddit = parseInt(MAX_PER_SUBREDDIT_ARG, 10);
    return new Map(available.map(item => [
      item.subreddit,
      Math.min(item.count, maxPerSubreddit),
    ]));
  }

  const budgets = new Map(available.map(item => [item.subreddit, 0]));
  let remaining = totalLimit;

  if (totalLimit >= available.length) {
    for (const item of available) {
      budgets.set(item.subreddit, 1);
      remaining--;
    }
  }

  const extraCapacity = available.reduce((sum, item) => {
    return sum + Math.max(item.count - budgets.get(item.subreddit), 0);
  }, 0);

  if (remaining <= 0 || extraCapacity === 0) return budgets;

  const fractionalShares = available.map(item => {
    const current = budgets.get(item.subreddit);
    const capacity = Math.max(item.count - current, 0);
    const exactShare = remaining * (capacity / extraCapacity);
    const wholeShare = Math.floor(exactShare);

    budgets.set(item.subreddit, current + wholeShare);

    return {
      subreddit: item.subreddit,
      remainder: exactShare - wholeShare,
      capacity,
    };
  });

  remaining = totalLimit - [...budgets.values()].reduce((sum, count) => sum + count, 0);
  fractionalShares
    .sort((a, b) => b.remainder - a.remainder || b.capacity - a.capacity)
    .forEach(item => {
      if (remaining <= 0) return;
      const current = budgets.get(item.subreddit);
      const count = candidatesBySubreddit.get(item.subreddit)?.length || 0;
      if (current >= count) return;
      budgets.set(item.subreddit, current + 1);
      remaining--;
    });

  return budgets;
}

// ── Reddit JSON API — pure fetch, zero dependencies ──────────────────

async function fetchReddit(url, attempt = 1) {
  try {
    await sleep(REQUEST_DELAY); // be polite to Reddit's servers
    const res = await fetch(url, {
      headers: {
        "User-Agent": "reddit-researcher-bot/1.0 (local research tool)",
        "Accept":     "application/json",
      },
    });

    if (res.status === 429 && attempt === 1) {
      const resetSeconds = Number(res.headers.get("x-ratelimit-reset") || 30);
      const waitSeconds = Math.max(5, Math.min(resetSeconds + 1, 90));
      console.warn(`  Reddit rate limit hit. Waiting ${waitSeconds}s before retrying...`);
      await sleep(waitSeconds * 1000);
      return fetchReddit(url, attempt + 1);
    }

    if (!res.ok) {
      console.warn(`  Reddit request failed (${res.status}) for ${url}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.warn(`  Reddit request failed: ${err.message}`);
    return null;
  }
}

async function searchSubreddit(subreddit, query, time, limit = 15) {
  const url = createRedditUrl("https://www.reddit.com", `/r/${subreddit}/search.json`, {
    q: query,
    sort: "relevance",
    t: time,
    limit,
    restrict_sr: 1,
  });
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
  const url = createRedditUrl("https://www.reddit.com", `/r/${subreddit}/top.json`, {
    t: time,
    limit,
  });
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
  const url = createRedditUrl("https://www.reddit.com", `${permalink}.json`, {
    limit: 50,
    sort: "top",
  });
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
  const url = createRedditUrl("https://www.reddit.com", "/subreddits/search.json", {
    q: topic,
    limit: 10,
  });
  const data = await fetchReddit(url);
  const found = new Map();
  const topicKeys = getTopicKeys(topic);

  if (data?.data?.children) {
    for (const c of data.data.children) {
      const displayName = c.data?.display_name?.toLowerCase();
      if (!displayName || ["all", "popular"].includes(displayName)) continue;

      const candidate = {
        displayName,
        title: c.data?.title || "",
        description: c.data?.public_description || "",
        subscribers: Number(c.data?.subscribers || 0),
      };
      const score = scoreSubredditCandidate(candidate, topicKeys);
      if (score < 50) continue;

      const previous = found.get(displayName);
      if (!previous || score > previous.score) found.set(displayName, { ...candidate, score });
    }
  }

  return [...found.values()]
    .sort((a, b) => b.score - a.score || b.subscribers - a.subscribers)
    .map(candidate => candidate.displayName);
}

// ── Step 1: Subreddit Discovery ──────────────────────────────────────

async function discoverSubreddits(topic) {
  if (SUBREDDITS_ARG) {
    const manual = SUBREDDITS_ARG
      .split(",")
      .map(s => s.trim().replace(/^r\//, "").toLowerCase())
      .filter(Boolean);
    console.log(`Using provided subreddits: ${manual.join(", ")}`);
    return manual;
  }

  console.log(`\n[1/6] Discovering subreddits for "${topic}"...`);

  const fromReddit = await discoverSubredditsFromReddit(topic);

  if (fromReddit.length > 0) {
    const discovered = fromReddit.slice(0, 5);
    console.log(`Found subreddits from Reddit: ${discovered.join(", ")}`);
    return discovered;
  }

  console.warn(`No topic-specific subreddits found for "${topic}". Falling back to generic defaults.`);
  const defaults = DEFAULT_SUBREDDITS.slice(0, 5);
  console.log(`Fallback subreddits: ${defaults.join(", ")}`);
  return defaults;
}

// ── Step 2: Post Discovery ───────────────────────────────────────────

async function discoverPosts(subreddits, topic) {
  console.log(`\n[2/6] Discovering posts across ${subreddits.length} subreddits...`);

  const candidatesBySubreddit = new Map(subreddits.map(sub => [sub, []]));
  const seen = new Set();

  function addCandidate(post) {
    const key = post.url.split("?")[0];
    if (seen.has(key)) return false;
    seen.add(key);
    const subreddit = (post.subreddit || "").toLowerCase();
    if (!candidatesBySubreddit.has(subreddit)) candidatesBySubreddit.set(subreddit, []);
    candidatesBySubreddit.get(subreddit).push({ ...post, url: key });
    return true;
  }

  if (MAX_PER_SUBREDDIT_ARG) {
    console.log(`  Max per subreddit: ${MAX_PER_SUBREDDIT_ARG} posts`);
  } else {
    console.log(`  Allocation: proportional to candidates found per subreddit`);
  }

  for (const sub of subreddits) {
    console.log(`  Searching r/${sub}...`);
    let candidateCount = 0;

    for (const query of buildSearchQueries(topic)) {
      const results = await searchSubreddit(sub, query, TIME, 10);
      for (const r of results) {
        if (addCandidate(r)) candidateCount++;
      }
    }

    const top = await getTopPosts(sub, TIME, 10);
    const topicWords = topic.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length >= 3);
    for (const r of top) {
      const title = r.title.toLowerCase();
      if (topicWords.some(word => title.includes(word)) && addCandidate(r)) candidateCount++;
    }

    console.log(`    r/${sub}: ${candidateCount} candidates`);
  }

  const budgets = allocatePostBudgets(candidatesBySubreddit, subreddits, LIMIT);
  const allPosts = [];

  for (const sub of subreddits) {
    const budget = budgets.get(sub) || 0;
    const posts = candidatesBySubreddit.get(sub) || [];
    const selected = posts
      .sort((a, b) => scorePost(b.title, b.selftext, b.commentCount, b.upvotes)
        - scorePost(a.title, a.selftext, a.commentCount, a.upvotes))
      .slice(0, budget);

    allPosts.push(...selected);
    if (posts.length > 0) console.log(`    r/${sub}: selected ${selected.length}/${posts.length}`);
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
    topPainPoints:        [...new Map(
                            [...themes.PRICING, ...themes.MISSING_FEATURE]
                              .sort((a, b) => b.score - a.score)
                              .map(p => [p.url, { title: p.title, url: p.url }])
                          ).values()].slice(0, 10),
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(outputDir, "raw", "index.json"), JSON.stringify(index, null, 2));
  return index;
}

// ── Skill: Churn Signal Extraction ───────────────────────────────

function extractChurnSignals(posts) {
  const churnSignals = [];
  const churnPatterns = [
    /\bcancelled\b/gi, /\bcanceled\b/gi, /\bcancelling\b/gi,
    /\bswitched (?:to|from)\b/gi, /\bmoved (?:to|from)\b/gi,
    /\bleft (?:\w+ )?\b/gi, /\bdone with\b/gi,
    /\bdeal.?breaker\b/gi, /\bnot worth it\b/gi,
    /\btoo expensive\b/gi, /\bcan'?t justify\b/gi,
    /\bwaste (?:of )?money\b/gi, /\brefund\b/gi,
    /\bgiving up\b/gi, /\bwon'?t renew\b/gi
  ];

  for (const post of posts) {
    if (!post) continue;
    const allText = `${post.title} ${post.body} ${post.comments.map(c => c.text).join(" ")}`;
    for (const pattern of churnPatterns) {
      const matches = allText.match(pattern);
      if (matches) {
        for (const m of matches) {
          churnSignals.push({
            type: "churn",
            postUrl: post.url,
            postTitle: post.title,
            upvotes: post.upvotes,
            excerpt: m,
            source: "reddit"
          });
        }
      }
    }
    for (const c of post.highSignalComments || []) {
      for (const pattern of churnPatterns) {
        if (pattern.test(c.text)) {
          churnSignals.push({
            type: "churn",
            postUrl: post.url,
            commentText: c.text.slice(0, 300),
            upvotes: c.upvotes,
            excerpt: c.text.slice(0, 150),
            source: "comment"
          });
        }
      }
    }
  }
  return churnSignals;
}

// ── Skill: Competitor Matrix ───────────────────────────────────────

function buildCompetitorMatrix(posts) {
  const switches = [];
  const switchPatterns = [
    { dir: "FROM", pattern: /(?:switched|moved|migrated) (?:away )?(?:from|off) (\w[\w\s]*)/gi },
    { dir: "TO", pattern: /(?:switched|moved|migrated) (?:to|over to) (\w[\w\s]*)/gi },
    { dir: "FROM", pattern: /(?:leaving|quitting) (\w[\w\s]*)/gi },
    { dir: "TO", pattern: /(?:going|over to) (\w[\w\s]*)/gi },
    { dir: "FROM", pattern: /(?:from|off|using) (\w+?) (?:to|now|instead)/gi },
    { dir: "TO", pattern: /(?:to|now using) (\w[\w\s]*?)(?: instead| now)?/gi }
  ];

  const competitors = new Map();

  for (const post of posts) {
    if (!post) continue;
    const allText = `${post.title} ${post.body} ${post.comments.map(c => c.text).join(" ")}`.toLowerCase();
    for (const { dir, pattern } of switchPatterns) {
      const matches = [...allText.matchAll(pattern)];
      for (const match of matches) {
        const competitor = match[1]?.trim();
        if (competitor && competitor.length > 2 && competitor.length < 50) {
          const key = `${dir}:${competitor}`;
          if (!competitors.has(key)) {
            competitors.set(key, {
              direction: dir,
              name: competitor,
              count: 0,
              posts: [],
              quotes: []
            });
          }
          const entry = competitors.get(key);
          entry.count++;
          entry.posts.push(post.url);
          entry.quotes.push({
            text: allText.slice(Math.max(0, match.index - 50), Math.min(allText.length, match.index + 100)),
            url: post.url
          });
        }
      }
    }
  }

  return Array.from(competitors.values()).sort((a, b) => b.count - a.count);
}

// ── Skill: Persona Detection ───────────────────────────────────────

function detectPersonas(posts) {
  const personaPatterns = {
    student: /\b(student|cs major|thesis|college|university|class|assignment|professor)\b/gi,
    founder: /\b(founder|startup|yc|seed|funding|my company|entrepreneur)\b/gi,
    engineer: /\b(engineer|developer|devops|backend|frontend|api|codebase|git)\b/gi,
    creator: /\b(creator|influencer|youtuber|content|subscriber|follower)\b/gi,
    "team-lead": /\b(manager|team lead|lead engineer|cto|director|head of)\b/gi,
    freelancer: /\b(freelancer|contractor|gig|client|project)\b/gi,
    designer: /\b(designer|figma|ui.?ux|wireframe|prototype)\b/gi,
    marketer: /\b(marketer|growth|seo|conversion|campaign|roi)\b/gi,
    "small-business": /\b(small business|shop|local|retail|owner)\b/gi,
    enterprise: /\b(enterprise|corporate|large company|at scale)\b/gi
  };

  const results = {};
  for (const persona in personaPatterns) {
    results[persona] = { count: 0, quotes: [], posts: [] };
  }

  for (const post of posts) {
    if (!post) continue;
    const allText = `${post.title} ${post.body} ${post.comments.map(c => c.text).join(" ")}`;
    const lowerText = allText.toLowerCase();
    for (const [persona, pattern] of Object.entries(personaPatterns)) {
      const matches = [...lowerText.matchAll(pattern)];
      if (matches.length > 0) {
        results[persona].count += matches.length;
        results[persona].posts.push(post.url);
        results[persona].quotes.push({
          excerpt: allText.slice(0, 200),
          matches: matches.map(m => m[0]),
          url: post.url
        });
      }
    }
  }

  return results;
}

// ── Skill: Sentiment Scoring ───────────────────────────────────────

function scoreSentiment(posts) {
  const categories = {
    frustration: { words: ["frustrating", "infuriating", "annoying", "disappointed", "angry", "terrible", "awful", "hate"], count: 0, quotes: [] },
    praise: { words: ["love", "amazing", "perfect", "excellent", "great", "wonderful", "fantastic", "best"], count: 0, quotes: [] },
    confusion: { words: ["confusing", "complicated", "unclear", "don't understand", "no idea", "uncertain"], count: 0, quotes: [] },
    urgency: { words: ["urgent", "critical", "emergency", "asap", "immediately", "blocked", "deadline"], count: 0, quotes: [] },
    workaround: { words: ["hack", "workaround", "trick", "cobbled", "kludge"], count: 0, quotes: [] },
    "churn-risk": { words: ["cancelled", "canceled", "switching", "leaving", "won't renew"], count: 0, quotes: [] }
  };

  for (const post of posts) {
    if (!post) continue;
    const allComments = [post.body, ...post.comments.map(c => c.text)];
    for (const text of allComments) {
      if (!text) continue;
      const lower = text.toLowerCase();
      for (const type of Object.keys(categories)) {
        for (const word of categories[type].words) {
          if (lower.includes(word)) {
            categories[type].count++;
            categories[type].quotes.push({ text: text.slice(0, 200), source: post.url, upvotes: post.upvotes });
            break;
          }
        }
      }
    }
  }

  return categories;
}

// ── Skill: Feature Request Ranking ──────────────────────────────────

function rankFeatureRequests(posts) {
  const requests = new Map();

  const requestPatterns = [
    /(?:wish|want|need) (?:to|a|an|the) ([\w\s]+?)(?:\.|,|!|$)/gi,
    /(?:please|plz) (?:add|include|support) ([\w\s]+?)(?:\.|,|$)/gi,
    /(?:(?:should|could) (?:have|include)|missing) (?:a|an|the)? ([\w\s]+?)(?:\.|,|$)/gi,
    /(?:feature|option|setting) (?:for|request) ([\w\s]+?)(?:\.|,|$)/gi
  ];

  for (const post of posts) {
    if (!post) continue;
    const allText = `${post.title} ${post.body} ${post.comments.map(c => c.text).join(" ")}`;
    const lowerText = allText.toLowerCase();

    for (const pattern of requestPatterns) {
      const matches = [...lowerText.matchAll(pattern)];
      for (const match of matches) {
        const feature = match[1]?.trim();
        if (feature && feature.length > 3 && feature.length < 100) {
          if (!requests.has(feature)) {
            requests.set(feature, { feature, frequency: 0, intensity: 0, agreement: 0, quotes: [] });
          }
          const req = requests.get(feature);
          req.frequency++;
          req.agreement += Math.floor(post.upvotes / 50) + 1;
          if (lowerText.includes("critical") || lowerText.includes("must")) req.intensity += 3;
          else if (lowerText.includes("need") || lowerText.includes("wish")) req.intensity += 2;
          else req.intensity += 1;
          req.quotes.push({ text: allText.slice(0, 150), url: post.url });
        }
      }
    }
  }

  const ranked = [...requests.values()]
    .map(r => ({ ...r, score: r.frequency + r.intensity + Math.min(r.agreement, 10) }))
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, 20);
}

// ── Skill: Evidence Quality Scoring ──────────────────────────────────

function scoreEvidence(posts) {
  const scored = [];

  for (const post of posts) {
    if (!post) continue;
    const allComments = [post.body, ...post.comments.map(c => c.text)];

    for (const [idx, text] of allComments.entries()) {
      if (!text || text.length < 30) continue;

      const upvotes = idx === 0 ? post.upvotes : post.comments[idx - 1]?.upvotes || 0;
      let authority = 5;
      if (upvotes >= 500) authority = 25;
      else if (upvotes >= 200) authority = 20;
      else if (upvotes >= 50) authority = 15;
      else if (upvotes >= 10) authority = 10;

      const engagement = post.commentCount > 25 ? 20 : post.commentCount > 10 ? 15 : post.commentCount > 3 ? 10 : 5;
      const recency = 15;
      const corroboration = 10;
      const total = Math.min(authority + engagement + recency + corroboration, 100);

      scored.push({
        text: text.slice(0, 300),
        score: total,
        authority, engagement, recency, corroboration,
        upvotes, url: post.url,
        tier: total >= 90 ? "exceptional" : total >= 70 ? "high" : total >= 50 ? "moderate" : total >= 30 ? "low" : "minimal"
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, 50);
}

// ── Skill: CSV Schema Enforcement ───────────────────────────────────

function enforceCsvSchema(posts) {
  const rows = [];
  for (const post of posts) {
    if (!post) continue;
    rows.push({
      topic: TOPIC,
      date: new Date().toISOString().split("T")[0],
      subreddit: post.subreddit,
      post_id: post.url.split("/").slice(-2, -1)[0],
      post_url: post.url,
      post_title: post.title.replace(/"/g, '""'),
      post_upvotes: post.upvotes,
      comment_id: "",
      comment_text: "",
      category: "",
      sentiment: "",
      persona: "",
      is_churn_signal: "false",
      competitive_tool: "",
      switch_direction: "",
      quote_quality: "",
      evidence_source: "post",
      extracted_date: new Date().toISOString()
    });
    for (const c of post.comments) {
      rows.push({
        topic: TOPIC,
        date: new Date().toISOString().split("T")[0],
        subreddit: post.subreddit,
        post_id: post.url.split("/").slice(-2, -1)[0],
        post_url: post.url,
        post_title: post.title.replace(/"/g, '""'),
        post_upvotes: post.upvotes,
        comment_id: "c" + Math.random().toString(36).substr(2, 9),
        comment_text: (c.text || "").replace(/"/g, '""').slice(0, 500),
        category: "",
        sentiment: "",
        persona: "",
        is_churn_signal: "false",
        competitive_tool: "",
        switch_direction: "",
        quote_quality: "",
        evidence_source: "comment",
        extracted_date: new Date().toISOString()
      });
    }
  }
  return rows;
}

// ── Skill: Landing Page Copy Generator ──────────────────────────────

function generateLandingCopy(posts) {
  const headlines = [];
  const testimonials = [];
  const valueProps = [];

  for (const post of posts) {
    if (!post) continue;
    const allComments = [post.body, ...post.comments.map(c => c.text)];
    for (const text of allComments) {
      if (!text) continue;
      const lower = text.toLowerCase();
      if (lower.includes("love") || lower.includes("perfect") || lower.includes("exactly")) {
        testimonials.push(text.slice(0, 200));
      }
      if (lower.includes("frustrating") || lower.includes("tired of") || lower.includes("wish")) {
        const words = text.split(" ").slice(0, 10).join(" ");
        headlines.push(words);
      }
      if (lower.includes("because") || lower.includes("helps") || lower.includes("allows")) {
        valueProps.push(text.slice(0, 150));
      }
    }
  }

  return {
    headlines: [...new Set(headlines)].slice(0, 5),
    testimonials: [...new Set(testimonials)].slice(0, 5),
    valueProps: [...new Set(valueProps)].slice(0, 5)
  };
}

// ── Skill: Founder Summary Mode ─────────────────────────────────────

function generateFounderSummary(posts, churn, competitors, personas, sentiment, features) {
  const opportunities = features.slice(0, 5).map(f => ({
    title: f.feature,
    evidence: `${f.frequency} mentions, intensity ${f.intensity}`,
    quotes: f.quotes.slice(0, 2)
  }));

  const antiPatterns = churn.slice(0, 3).map(c => ({
    title: c.excerpt || "Churn risk",
    evidence: c.postUrl,
    severity: "high"
  }));

  const positioning = [];
  for (const t of sentiment.frustration.quotes.slice(0, 3)) {
    positioning.push(`"${t.text.slice(0, 80)}..."`);
  }

  const topPersona = Object.entries(personas)
    .sort((a, b) => b[1].count - a[1].count)[0];

  return {
    opportunities,
    antiPatterns,
    positioning,
    topPersona: topPersona ? topPersona[0] : "unknown",
    competitorInsights: competitors.slice(0, 5),
    actionItems: [
      { priority: "P0", action: `Build: ${features[0]?.feature || "Top requested feature"}` },
      { priority: "P1", action: `Fix: ${antiPatterns[0]?.title || "Churn issue"}` },
      { priority: "P2", action: "Position: On pain points from user quotes" }
    ]
  };
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

  // ── Skill Application ──────────────────────────────────────────────
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  SKILL ANALYSIS`);
  console.log(`${"=".repeat(60)}`);

  // 7 - Churn Signal Extraction
  console.log(`\n[7/15] Extracting churn signals...`);
  const churnSignals = extractChurnSignals(posts);
  console.log(`  Found ${churnSignals.length} churn signals`);
  const churnPath = join(OUTPUT_DIR, "churn_signals.json");
  writeFileSync(churnPath, JSON.stringify(churnSignals, null, 2));

  // 8 - Competitor Matrix
  console.log(`\n[8/15] Building competitor matrix...`);
  const competitors = buildCompetitorMatrix(posts);
  console.log(`  Found ${competitors.length} competitor patterns`);
  const compPath = join(OUTPUT_DIR, "competitor_matrix.json");
  writeFileSync(compPath, JSON.stringify(competitors, null, 2));

  // 9 - Persona Detection
  console.log(`\n[9/15] Detecting user personas...`);
  const personas = detectPersonas(posts);
  console.log(`  Persona breakdown:`);
  for (const [p, data] of Object.entries(personas)) {
    if (data.count > 0) console.log(`    ${p.padEnd(20)} ${data.count} mentions`);
  }
  const personaPath = join(OUTPUT_DIR, "personas.json");
  writeFileSync(personaPath, JSON.stringify(personas, null, 2));

  // 10 - Sentiment Scoring
  console.log(`\n[10/15] Scoring sentiment...`);
  const sentiment = scoreSentiment(posts);
  console.log(`  Sentiment breakdown:`);
  for (const [type, data] of Object.entries(sentiment)) {
    if (data.count > 0) console.log(`    ${type.padEnd(20)} ${data.count} quotes`);
  }
  const sentimentPath = join(OUTPUT_DIR, "sentiment.json");
  writeFileSync(sentimentPath, JSON.stringify(sentiment, null, 2));

  // 11 - Feature Request Ranking
  console.log(`\n[11/15] Ranking feature requests...`);
  const features = rankFeatureRequests(posts);
  console.log(`  Found ${features.length} feature requests`);
  if (features.length > 0) {
    console.log(`  Top requests:`);
    for (const f of features.slice(0, 5)) {
      console.log(`    ${f.feature} (score: ${f.score}) - ${f.frequency} mentions`);
    }
  }
  const featuresPath = join(OUTPUT_DIR, "feature_requests.json");
  writeFileSync(featuresPath, JSON.stringify(features, null, 2));

  // 12 - Evidence Quality Scoring
  console.log(`\n[12/15] Scoring evidence quality...`);
  const evidence = scoreEvidence(posts);
  console.log(`  Quality breakdown:`);
  const tiers = { exceptional: 0, high: 0, moderate: 0, low: 0, minimal: 0 };
  for (const e of evidence) tiers[e.tier]++;
  for (const [t, c] of Object.entries(tiers)) {
    if (c > 0) console.log(`    ${t.padEnd(20)} ${c} findings`);
  }
  const evidencePath = join(OUTPUT_DIR, "evidence_quality.json");
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));

  // 13 - CSV Schema Export
  console.log(`\n[13/15] Generating CSV schema...`);
  const csvRows = enforceCsvSchema(posts);
  const csvHeader = [
    "topic","date","subreddit","post_id","post_url","post_title","post_upvotes",
    "comment_id","comment_text","category","sentiment","persona","is_churn_signal",
    "competitive_tool","switch_direction","quote_quality","evidence_source","extracted_date"
  ].join(",");
  const csvLines = [csvHeader, ...csvRows.map(r => 
    Object.values(r).map(v => typeof v === "string" && v.includes(",") ? `"${v}"` : v).join(",")
  )];
  const csvPath = join(OUTPUT_DIR, "data.csv");
  writeFileSync(csvPath, csvLines.join("\n"));
  console.log(`  CSV exported`);

  // 14 - Landing Page Copy
  console.log(`\n[14/15] Generating landing page copy...`);
  const copy = generateLandingCopy(posts);
  const copyPath = join(OUTPUT_DIR, "landing_page_copy.json");
  writeFileSync(copyPath, JSON.stringify(copy, null, 2));
  if (copy.headlines.length > 0) {
    console.log(`  Headlines:`);
    for (const h of copy.headlines.slice(0, 3)) console.log(`    "${h}"`);
  }

  // 15 - Founder Summary
  console.log(`\n[15/15] Generating founder summary...`);
  const founder = generateFounderSummary(posts, churnSignals, competitors, personas, sentiment, features);
  const founderPath = join(OUTPUT_DIR, "founder_summary.json");
  writeFileSync(founderPath, JSON.stringify(founder, null, 2));
  console.log(`  Top persona: ${founder.topPersona}`);
  console.log(`  Action items: ${founder.actionItems.length}`);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  OUTPUT: ${OUTPUT_DIR}`);
  console.log(`${"=".repeat(60)}`);
  console.log(JSON.stringify({ index, churnSignals: churnSignals.length, competitors: competitors.length, personas, sentiment: Object.fromEntries(Object.entries(sentiment).map(([k,v]) => [k, v.count])), featureRequests: features.length, evidenceQuality: tiers }, null, 2));

   // Auto-compile to HTML report
   if (!NO_COMPILE) {
     console.log(`\n[16/16] Compiling HTML report...`);
     try {
       const scriptDir = new URL('.', import.meta.url).pathname;
       verbose(`Running: node compile_report.mjs "${OUTPUT_DIR}"`);
       execSync(`node compile_report.mjs "${OUTPUT_DIR}"`, { 
         stdio: 'inherit',
         cwd: scriptDir
       });
       console.log(`✓ Report compiled successfully`);
     } catch (err) {
       console.warn(`⚠ Report compilation failed (but extraction succeeded). Run manually:`);
       console.warn(`  node scripts/compile_report.mjs "${OUTPUT_DIR}"`);
     }
   }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
