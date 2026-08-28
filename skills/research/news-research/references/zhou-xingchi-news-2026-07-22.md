# Example: 周星驰 News Search (2026-07-22)

Session that motivated this skill. User asked for "周星驰 last week's news" in Chinese.

## Search Attempts

| Engine | URL | Result |
|--------|-----|--------|
| Baidu (百度) | `baidu.com/s?tn=news&wd=...` | Captcha blocked |
| Bing (cn.bing.com) | `cn.bing.com/news/search?q=...` | Redirect to homepage |
| Sogou (搜狗) | `news.sogou.com/news?query=...` | Empty (0 bytes) |
| Google News RSS | `news.google.com/rss/search?q=...` | 404/blocked from mainland |
| **360 Search (360搜索)** | `news.so.com/ns?q=...` | **Success!** ~60KB HTML |

## Working Curl Command

```bash
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
curl -sL --max-time 30 -A "$UA" \
  "https://news.so.com/ns?q=%E5%91%A8%E6%98%9F%E9%A9%B0&pn=1&tn=newstitle" \
  -o so360news.html
```

## Parsing Commands That Worked

```bash
# Split HTML into lines (one tag per line)
tr '\r' ' ' < so360news.html | sed 's/></>\n</g' > so_lines.txt

# Find all titles with timestamps
grep -nE 'title="[^"]*周星驰|title="[^"]*星爷|title="[^"]*功夫女足|sitename|time">' so_lines.txt | head -120

# Matched structure:
# line 461: <a ... title="...">  (article title)
# line 473: <cite class="sitename">快资讯</cite>  (source)
# line 474: <span class="g-linkinfo-txt g-c-gray time">1小时前</span>  (timestamp)
# line 469: <p class="summary g-ellipsis3">  (summary text)
```

## Key Finding: All News Centered on One Event

The 20+ search results all converged on a single topic: **周星驰新片《功夫女足》** (Stephen Chow's new film "Kung Fu Women's Football"). Topics included:
- Box office: 9 days → 14–16 billion RMB
- Controversy: "ticket theft" (偷票房) → Chow posted "???" on social media
- Fan backlash: fans reclaimed ~1.6M RMB
- Nostalgia marketing: 64-year-old Chow recreated "酱爆舞" (25-year callback)
- Competition: 《八仙!》 advance release challenges box office
- Polarized reviews: Douban 6.5, accused of being "AI-generated-looking effects"

## Source Attribution

- 360 Search aggregates → most results show **快资讯** (360's own platform) as source
- 1 result had a verifiable external URL: **新浪财经** (finance.sina.com.cn) — article about 徐静雨 praising the film
- Most articles were self-media (自媒体) / aggregation content, not authoritative news outlets

## Lesson Learned

For Chinese celebrity/news queries, **360 Search (news.so.com)** is the most reliable gateway. Worth trying first.