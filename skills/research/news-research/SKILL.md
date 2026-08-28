---
name: news-research
title: News Research
description: Search for and summarize recent news on a topic — extract structured results from web search engines, handle Chinese-language sources, and present findings in a user-preferred format.
---

# News Research

Search for recent news on a topic and produce a structured summary with real sources.

## Trigger
- User asks "search for news about X" or "find recent news on Y"
- User asks about recent events, trends, or developments on a specific topic
- Especially Chinese-language news queries

## Preferred Format

When the user asks for news, present results as:

1. **Structured items** (3–6 items), each with:
   - **Emoji + numbered heading** (e.g. `### 1. 🔥 Title`)
   - **Time** (as precise as possible, e.g. "2小时前", "2026-07-23")
   - **Brief content** (2–4 sentences, bullet-free prose)
   - **Source** (media name in `> 来源:` line)

2. **Overall trend summary** at the end — a paragraph synthesizing the key narrative.

3. **Formatting rules:**
   - Use emoji section headers for visual scanning
   - Keep items concise (3-5 lines each)
   - No bullet points inside items — use prose paragraphs
   - End with a "结论" or summary paragraph

4. **When results are from a single massive event** (e.g. a major award announcement), group sub-items under the main event instead of making them top-level items.

## Web Search Strategy (Chinese News)

Chinese news portals are frequently blocked by captchas, rate limiting, or redirects. Try sources in this order:

### 0. Baidu Hot List API — MOST RELIABLE (structured JSON, no captcha)

Baidu's hot list API returns clean JSON with titles, descriptions, hot scores, and images — no HTML parsing needed. Works from any environment (curl, execute_code, terminal).

```bash
curl -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  "https://top.baidu.com/api/board?tab=realtime" \
  -o /tmp/baidu.json
```

Response shape: `{"success":true,"data":{"cards":[{"component":"hotList","content":[...]}]}}`. Each content item has:
- `word` — the hot search title
- `desc` — description/summary text
- `hotScore` — numeric popularity score (e.g. "7809765")
- `query` — search query string
- `img` — thumbnail image URL
- `hotTag` — tag type (0=none, 3=hot)

Filter for entertainment items by checking if `word` contains keywords like 电影, 明星, 演员, 综艺, 剧, 歌手, 票房, 娱乐, etc.

For entertainment-specific results, use `?tab=entertainment` (though the realtime tab usually has enough).

**Python via execute_code (embedded Python works):**
```python
import urllib.request, json
req = urllib.request.Request("https://top.baidu.com/api/board?tab=realtime",
    headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://top.baidu.com/'})
with urllib.request.urlopen(req, timeout=10) as resp:
    obj = json.loads(resp.read())
    for card in obj['data']['cards']:
        for item in card['content']:
            print(item['word'], item.get('desc', ''), item.get('hotScore', ''))
```

### 1. Sina Feed API — structured JSON, good for specific categories

Sina's roll feed API returns JSON with titles, intros, media names, and timestamps. Try different `lid` values for different categories:

```bash
curl -s "https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2510&k=&num=20&page=1"
```

Known `lid` values:
- `2516` — general news / finance (broad)
- `2510` — mixed news (entertainment, sports, general)
- `2509` — finance/markets
- `10` — entertainment (may return empty)

Each item has: `title`, `intro` (summary), `media_name` (source), `ctime` (Unix timestamp), `url`.

**Python via execute_code:**
```python
import urllib.request, json
req = urllib.request.Request("https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2510&k=&num=20&page=1",
    headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=10) as resp:
    obj = json.loads(resp.read())
    for item in obj['result']['data']:
        print(item['title'], item.get('media_name', ''), item.get('intro', '')[:100])
```

### 2. 360 Search — fallback when APIs fail

Two endpoints work; try general search first for broader topics, then news-specific for filtering.

#### a) General 360 Search (www.so.com) — Broader, preferred for topic queries
```
curl -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36" \
  "https://www.so.com/s?q=<URL-encoded query>&pn=1" \
  -o /tmp/result.html
```
- Returns results with `<h3 class="res-title...">` containing `<a>` tags for titles
- Snippets/descriptions in `<p class="res-desc...">` or `<div class="res-rich...">`
- Timestamps may appear as relative text ("X小时前", "昨天") inside result blocks
- Use `-s` (silent), omit `-L` unless redirected — general search doesn't require follow

#### b) 360 News Search (news.so.com) — More structured, narrower
```
curl -sL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36" \
  "https://news.so.com/ns?q=<URL-encoded query>&pn=1&tn=newstitle" \
  -o /tmp/result.html
```
- Returns HTML with `title="..."` attributes on `<a>` tags for article titles
- Source name appears in `<cite class="sitename">` tags
- Timestamp appears in `<span class="g-linkinfo-txt g-c-gray time">` tags
- Summary text appears in `<p class="summary g-ellipsis3">` tags
- Date format: "X小时前", "X天前", or "2026-07-22"
- 360 Search aggregates from "快资讯" (its own platform) plus external sources like 新浪财经

### 2. Other engines (less reliable)
- **Baidu** (`baidu.com/s?tn=news`): Frequently triggers captcha — try with `-L -b` cookies but expect failure.
- **Bing** (`cn.bing.com/news/search`): May redirect to homepage. Try with `format=rss` parameter.
- **Sogou** (`news.sogou.com`): Often returns empty.
- **Google News** (`news.google.com/rss/search`): RSS feed may be blocked from mainland China.

### 3. Fallback: individual Chinese media sites
- If aggregators fail, try direct queries on major Chinese sites (e.g., sina.com.cn, 163.com, qq.com).

## HTML Parsing Technique

### Primary: grep/sed-based extraction (preferred on Windows/MSYS)

Python is often **unavailable** on Windows MSYS environments (Windows Store alias, broken installs). Use bash-native tools instead.

#### For general search (www.so.com/s?q=...):

```bash
# Extract titles from <h3 class="res-title..."> blocks
grep -oE 'res-title"><a [^>]*>[^<]*(<em>[^<]*</em>[^<]*)*</a>' result.html | sed -E 's/<[^>]+>//g'

# Extract timestamps (relative: "X小时前", "X天前")
grep -oE 'g-c-gray">[^<]+' result.html | grep -oE '[0-9]+小时前|[0-9]+天前|昨天|今天|[0-9]{4}-[0-9]{2}-[0-9]{2}'

# Extract summaries
grep -oE 'res-list-summary">[^<]*(<em>[^<]*</em>[^<]*)*' result.html | sed -E 's/<[^>]+>//g'

# Extract source names (from g-linkinfo-a href)
grep -oE 'g-linkinfo-a"[^>]*>[^<]+' result.html | sed -E 's/^[^>]*>//'

# One-liner: extract titles + timestamps + summaries with context
for f in result.html; do
  echo "=== $f ==="
  grep -oE '(res-title"><a [^>]*>.*?</a>|g-c-gray">[^<]*|res-list-summary">[^<]*)' "$f" \
    | sed -E 's/<[^>]+>//g' | grep -vE '^\s*$' | head -30
done
```

#### For news search (news.so.com/ns?q=...):

```bash
# Extract titles from title="..." attributes
grep -oP 'title="\K[^"]{8,80}(?=")' result.html

# Extract source names
grep -oP '<cite class="sitename">\K[^<]+' result.html

# Extract timestamps
grep -oP 'g-linkinfo-txt g-c-gray time">\K[^<]+' result.html

# Extract summaries
grep -oP 'summary g-ellipsis3">\K[^<]+' result.html
```

## Windows/MSYS Environment Quirks

This skill runs on a **Windows host with git-bash (MSYS)** terminal. Several quirks apply:

- **`python` in terminal is NOT usable.** The Windows Store shim (`python.exe` in `Microsoft/WindowsApps`) intercepts calls and opens the Store instead of running Python. The real Python is at `/c/Users/<user>/AppData/Local/Programs/Python/Python312/python.exe` — but even that path may be missing or broken. **Do NOT assume `python` in terminal is available.** Use bash/grep/sed for all parsing in terminal.
- **BUT `execute_code` tool uses the embedded Hermes Python** at `D:\llm-safe\hermes-agent\python_embedded\python.exe`, which IS available and has urllib, json, etc. For JSON API fetching (Baidu Hot List, Sina Feed), use `execute_code` instead of terminal curl+grep — it's faster and more reliable.
- **`curl` with `-L` may hang on some sites.** Test without `-L` first. 360 general search (`www.so.com/s?q=...`) works without `-L`; 360 news search (`news.so.com/ns?q=...`) may need it.
- **URL encoding is critical.** Spaces in query strings passed to `curl` cause `0 bytes` responses. Always URL-encode spaces as `%20` before passing to `curl`. Use `curl -s -A "..." "https://www.so.com/s?q=${qenc}"` where `qenc` is already encoded.
- **`write_file` tool resolves to Windows paths.** For scripts that need to live in the MSYS `/tmp/`, write them via `cat > /tmp/script.sh << 'EOF'` in terminal, not via the `write_file` tool.
- **`/tmp` may NOT exist on this MSYS host.** `curl ... -o /tmp/result.html` fails with "No such file or directory". Before the FIRST curl, create a guaranteed-writable temp dir and cd into it: `mkdir -p /c/Users/<user>/AppData/Local/Temp/news && cd /c/Users/<user>/AppData/Local/Temp/news`, then write result files with relative names (`-o news1.html`). Don't wait for the failure to discover this.
- **`tasklist` (not `ps aux`) for process checks.** Use `tasklist | grep -i msedge` to check running processes.
- **`which` may not find executables.** Use `command -v` or check paths directly.
- **Background processes via `start`.** Use `start msedge "https://..."` to launch GUI apps, then `sleep N` to wait for them to appear.

## Pitfalls

1. **Never fabricate news.** If search engines all fail (captcha, redirect, empty results), report that honestly — do not construct plausible-sounding but fake news items.
2. **Chinese search engines vary by day.** What worked yesterday (Baidu) may be blocked today. Always try 360 first, then fall back.
3. **Timestamps are relative.** "X小时前" means hours before the search time, not a fixed date. Convert to the session's date context.
4. **Source attribution can be weak.** 360's "快资讯" is an aggregation platform, not an original publisher. Note when a result lacks a verifiable original source URL.
5. **User format preference.** Always output structured items (title/time/summary/source) + trend summary, not a wall of text. The user expects conciseness and structure.
7. **Batch multiple queries.** For a topic like "X学术界近期热点", run 3-5 related queries (e.g. "X 奖", "X 突破", "X 顶刊") in parallel to cover different facets. The Python script approach in `references/360-multi-query-batch-parsing.md` is designed for this.

8. **360 general search vs news search.** The general search (`www.so.com/s?q=...`) returns broader results including blog posts, articles, and official pages. The news-specific endpoint (`news.so.com/ns?q=...&tn=newstitle`) filters to news-only. Use general search for academic/technical topics, news search for celebrity/current events.

9. **"2小时前" results from 360.** These are often aggregator pages (快资讯), not original news. Always check if the source is 快资讯 (self-media aggregation) vs a named outlet like 新华网, 腾讯新闻, or 新浪财经. Attribute accordingly.

11. **Edge browser window may not be capturable by cua-driver.** Even when `msedge.exe` processes are running, the GUI window may not appear in `capture` results (e.g., no on-screen window matched). This is a Windows/Edge quirk. If the browser GUI is unreachable, fall back to **curl-based search** immediately — do not spend multiple rounds retrying window capture.

12. **URL-encoding spaces is mandatory.** `curl -s "https://www.so.com/s?q=中国 数学"` will return 0 bytes. Always encode spaces as `%20` (not `+` for 360): `q=中国%20数学`. Multi-word queries MUST use `%20` between words.

13. **Relative timestamps need context.** 360 returns "X小时前" (X hours ago), "X天前" (X days ago). When compiling results, note the approximate time relative to the search moment. For a news summary covering "最近2天", filter results to ≤48小时前.

14. **Generic queries return stale junk for "today's news".** Broad terms like "今日新闻", "今日重大新闻", "今日头条" retrieve evergreen aggregator/blog pages from prior years (e.g. "今天全世界都在看的新闻2025.8.26"), NOT today's headlines. For a "what happened today" request, do TWO things: (a) date-pin the query with the current date, e.g. `q=2026年7月27日 新闻`; (b) fan out across specific hot-topic facets — active weather events (台风名), 时政要闻, 国际新闻, and any known ongoing big event (e.g. 世界人工智能大会) — then keep only ≤24小时前 hits and rank by cluster size. The topic with the most fresh sub-articles (e.g. a landfalling typhoon) is the lead story. Pure date-pin alone still surfaces mostly 早参/股东大会/招聘公告 boilerplate, so combine with facet queries.

See `references/chinese-math-news-2026-07-24.md` for a concrete full-session example — queries, HTML structure notes, and the complete findings.
See `references/chinese-entertainment-news-2026-07-27.md` for the Baidu Hot List API + Sina Feed API workflow for Chinese entertainment news, including the python-docx output pipeline.