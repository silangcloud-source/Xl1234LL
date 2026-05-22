/**
 * Forexlive RSS → Notion Pipeline
 * Cloudflare Worker — zero external dependencies
 *
 * Required env vars (set via wrangler secret or dashboard):
 *   NOTION_TOKEN          — Notion Internal Integration Token (secret_xxx)
 *   NOTION_DATABASE_ID    — 32-char Notion DB ID (without hyphens)
 *
 * Optional env vars:
 *   PROP_TITLE    — Title property name in Notion DB  (default: "Name")
 *   PROP_LINK     — URL property name                 (default: "Link")
 *   PROP_DATE     — Date property name                (default: "PubDate")
 *   PROP_STATUS   — Select property name              (default: "Status")
 *   STATUS_VALUE  — Default status value              (default: "待精读")
 *   MAX_ITEMS     — Max items to process per run      (default: "20")
 */

const RSS_URL       = 'https://www.fxstreet.com/rss/news';
const NOTION_API    = 'https://api.notion.com/v1';
const NOTION_VER    = '2022-06-28';

// Retry config
const MAX_RETRIES   = 3;
const RETRY_BASE_MS = 800;   // exponential: 800 / 1600 / 3200 ms
const NOTION_DELAY  = 350;   // ~3 req/sec average to stay under rate limit

/* ════════════════════════════════════════════════════════════════
   ENTRY POINTS
   ════════════════════════════════════════════════════════════════ */

export default {
  // HTTP trigger: GET /sync  (useful for manual test via curl or browser)
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path !== '/sync') {
      return text('Forexlive→Notion Worker\nGET /sync  to trigger a manual sync');
    }
    return runPipeline(env);
  },

  // Cron trigger (configured in wrangler.toml)
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runPipeline(env));
  },
};

/* ════════════════════════════════════════════════════════════════
   MAIN PIPELINE
   ════════════════════════════════════════════════════════════════ */

async function runPipeline(env) {
  const cfg = resolveConfig(env);
  if (!cfg.token || !cfg.dbId) {
    return json({ error: 'NOTION_TOKEN and NOTION_DATABASE_ID must be set' }, 400);
  }

  let items, existingLinks;

  // 1. Fetch + parse RSS
  try {
    const xml = await fetchWithRetry(RSS_URL);
    items = parseRSS(xml).slice(0, cfg.maxItems);
  } catch (err) {
    console.error('[RSS] fetch/parse failed:', err.message);
    return json({ error: 'RSS fetch failed', detail: err.message }, 502);
  }

  // 2. Load existing Notion URLs for dedup
  try {
    existingLinks = await notionGetExistingLinks(cfg);
  } catch (err) {
    console.error('[Notion] dedup query failed:', err.message);
    return json({ error: 'Notion query failed', detail: err.message }, 502);
  }

  // 3. Write new items
  let added = 0, skipped = 0, failed = 0;
  for (const item of items) {
    if (existingLinks.has(item.link)) { skipped++; continue; }
    try {
      await notionCreatePage(cfg, item);
      existingLinks.add(item.link);
      added++;
    } catch (err) {
      console.error('[Notion] create page failed for', item.link, '—', err.message);
      failed++;
    }
    await sleep(NOTION_DELAY);
  }

  console.log(`[done] added=${added} skipped=${skipped} failed=${failed} total=${items.length}`);
  return json({ success: true, added, skipped, failed, total: items.length });
}

/* ════════════════════════════════════════════════════════════════
   RSS — FETCH & PARSE
   ════════════════════════════════════════════════════════════════ */

async function fetchWithRetry(url, options = {}) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_BASE_MS * Math.pow(2, attempt - 1));
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'FinRead-RSS-Bot/1.0' },
        ...options,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      console.warn(`[fetch] attempt ${attempt + 1} failed: ${err.message}`);
    }
  }
  throw lastErr;
}

function parseRSS(xml) {
  const items = [];
  const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const raw = {
      title:       extractTag(block, 'title'),
      link:        extractTag(block, 'link') || extractTag(block, 'guid'),
      description: extractTag(block, 'description') || extractTag(block, 'content:encoded'),
      pubDate:     extractTag(block, 'pubDate') || extractTag(block, 'dc:date'),
    };
    if (!raw.title || !raw.link) continue;
    items.push({
      title:       cleanText(raw.title),
      link:        raw.link.trim(),
      description: cleanHtml(raw.description),
      pubDate:     parsePubDate(raw.pubDate),
    });
  }
  return items;
}

// Extracts content from an XML tag, handles CDATA and plain text
function extractTag(xml, tag) {
  // CDATA: <tag><![CDATA[...]]></tag>
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i');
  const cdataM  = cdataRe.exec(xml);
  if (cdataM) return cdataM[1];

  // Plain text (may include sub-tags we'll strip later)
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const plainM  = plainRe.exec(xml);
  if (plainM) return plainM[1];

  // Self-closing or text-only (e.g. <link>url</link> without close in some feeds)
  const looseRe = new RegExp(`<${tag}[^>]*\\/?>([^<]*)`, 'i');
  const looseM  = looseRe.exec(xml);
  return looseM ? looseM[1] : '';
}

/* ════════════════════════════════════════════════════════════════
   TEXT CLEANING
   ════════════════════════════════════════════════════════════════ */

// Strip all HTML/XML tags and decode common entities — output: clean plain English
function cleanHtml(raw) {
  if (!raw) return '';
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')  // remove script blocks first
    .replace(/<style[\s\S]*?<\/style>/gi, '')     // remove style blocks
    .replace(/<br\s*\/?>/gi, '\n')               // preserve line breaks
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')                    // strip remaining tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]{2,8};/gi, '')              // drop remaining named entities
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ') // keep only printable ASCII + whitespace
    .replace(/[ \t]+/g, ' ')                    // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')                 // collapse excess newlines
    .trim();
}

// Lighter clean for title/link fields (just entity decode + whitespace normalise)
function cleanText(raw) {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePubDate(raw) {
  if (!raw) return null;
  try {
    const d = new Date(raw.trim());
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch { return null; }
}

/* ════════════════════════════════════════════════════════════════
   NOTION API
   ════════════════════════════════════════════════════════════════ */

function notionHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': NOTION_VER,
    'Content-Type': 'application/json',
  };
}

// Returns a Set of link URLs already in the DB (handles Notion pagination)
async function notionGetExistingLinks(cfg) {
  const links = new Set();
  let cursor = undefined;

  do {
    const body = {
      page_size: 100,
      filter: { property: cfg.propLink, url: { is_not_empty: true } },
      ...(cursor ? { start_cursor: cursor } : {}),
    };
    const data = await notionRequest(cfg.token, 'POST',
      `/databases/${cfg.dbId}/query`, body);
    for (const page of data.results || []) {
      const urlProp = page.properties?.[cfg.propLink];
      if (urlProp?.url) links.add(urlProp.url);
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return links;
}

// Splits text into ≤2000-char Notion paragraph blocks
function toNotionBlocks(text) {
  if (!text) return [];
  const LIMIT = 2000;
  const blocks = [];
  let remaining = text;
  while (remaining.length > 0) {
    const chunk = remaining.slice(0, LIMIT);
    remaining  = remaining.slice(LIMIT);
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: chunk } }],
      },
    });
  }
  return blocks;
}

async function notionCreatePage(cfg, item) {
  const properties = {
    [cfg.propTitle]: {
      title: [{ type: 'text', text: { content: item.title.slice(0, 2000) } }],
    },
    [cfg.propLink]: { url: item.link },
    [cfg.propStatus]: { select: { name: cfg.statusValue } },
  };
  if (item.pubDate && cfg.propDate) {
    properties[cfg.propDate] = { date: { start: item.pubDate } };
  }

  const body = {
    parent: { database_id: cfg.dbId },
    properties,
    children: toNotionBlocks(item.description),
  };

  await notionRequest(cfg.token, 'POST', '/pages', body);
}

// Core Notion API request with retry + rate-limit back-off
async function notionRequest(token, method, path, body) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_BASE_MS * Math.pow(2, attempt - 1));
    let res;
    try {
      res = await fetch(NOTION_API + path, {
        method,
        headers: notionHeaders(token),
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      lastErr = err; continue;
    }
    // Notion rate limit: 429 — honour Retry-After header
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('Retry-After') || '2');
      console.warn(`[Notion] 429 — sleeping ${retryAfter}s`);
      await sleep(retryAfter * 1000);
      lastErr = new Error('Rate limited'); continue;
    }
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      lastErr = new Error(`Notion ${res.status}: ${errBody.slice(0, 200)}`);
      // 4xx (except 429) — no point retrying
      if (res.status >= 400 && res.status < 500) throw lastErr;
      continue;
    }
    return res.json();
  }
  throw lastErr;
}

/* ════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════ */

function resolveConfig(env) {
  return {
    token:       env.NOTION_TOKEN        || '',
    dbId:        (env.NOTION_DATABASE_ID || '').replace(/-/g, ''),
    propTitle:   env.PROP_TITLE          || 'Name',
    propLink:    env.PROP_LINK           || 'Link',
    propDate:    env.PROP_DATE           || 'PubDate',
    propStatus:  env.PROP_STATUS         || 'Status',
    statusValue: env.STATUS_VALUE        || '待精读',
    maxItems:    Number(env.MAX_ITEMS    || 20),
  };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const json  = (body, status = 200) => new Response(JSON.stringify(body, null, 2), { status, headers: { 'Content-Type': 'application/json' } });
const text  = (body, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });
