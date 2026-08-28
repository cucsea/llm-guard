# Chinese Mathematics News — 2026-07-24

## Session Summary

User asked for "最近2天中国数学学术界热点新闻" via 360 search. Core finding: **王虹、邓煜获菲尔兹奖** (Fields Medal) — first Chinese nationals to win, two in the same year.

## Queries Used

### Round 1 (broad exploration — 5 parallel queries)
```
0: 中国%20数学%20最新%20突破          → 401K
1: 中国%20数学家%20论文%20顶刊         → 372K
2: 中国%20数学%20研究%20进展%202026   → 378K
3: 数学%20菲尔兹奖%20中国             → 390K
4: 中国%20数学界%20新闻               → 364K
```

### Round 2 (focused on Fields Medal — 4 parallel queries)
```
10: 王虹%20菲尔兹奖%20挂谷猜想         → 388K
11: 邓煜%20菲尔兹奖%20成就            → 389K
12: 2026%20国际数学家大会%20菲尔兹奖   → 403K
13: 王虹%20邓煜%20北京大学            → 390K
```

## Parsing Command (one-liner for all result files)

```bash
grep -oE '(res-title"><a [^>]*>.*?</a>|g-c-gray">[^<]*|res-list-summary">[^<]*)' /tmp/r_*.html \
  | sed -E 's/<[^>]+>//g' | grep -vE '^\s*$' | head -50
```

## Key Findings

| Finding | Source | Timestamp |
|---------|--------|-----------|
| 王虹、邓煜获菲尔兹奖 | 快资讯 (via 观点网) | 6小时前 (2026-07-23) |
| 中国籍数学家首次获菲尔兹奖 | 中国新闻网 | 10小时前 |
| 王虹获奖 | 人民网 | 12分钟前 |
| 邓煜获菲尔兹奖 | 新浪财经 | 10小时前 |
| 北大发文祝贺王虹邓煜登热搜 | 搜狐 | 9小时前 |
| 王虹证明三维挂谷猜想 | 澎湃新闻 / 观察者网 | 背景 |
| 邓煜差点成为职业围棋选手 | 搜狐 | 9小时前 |
| 丘成桐希望两人回国任教 | 快资讯 | 9小时前 |
| 王虹13岁跳级上高中，16岁上北大 | 快资讯 | 9小时前 |
| 邓煜北大2007级本科同窗 | 中国新闻网 / 新京报 | 10小时前 |

## Core Articles

Three key aggregation articles that covered the most:
1. **搜狐**: "中国籍数学家菲尔兹奖双响，一文回顾来时路" — full background on both laureates
2. **快资讯**: "北大同窗双双冲击菲尔兹奖!35岁王虹破解百年挂谷猜想" — detailed research stories
3. **快资讯**: "北大同窗双双冲击菲尔兹奖" — about the conference presentation scene

## HTML Structure Notes (www.so.com general search)

- Titles: `<h3 class="res-title">` or `<h3 class="res-title"><a ...>` with linked text
- EM tags: `<em>` wraps keywords inside titles and summaries
- Timestamps: `<span class="g-c-gray">...</span>` — relative ("6小时前 - ", "10小时前 - ") or absolute ("2026年5月22日 - ")
- Summaries: text inside `res-list-summary">` blocks
- Aggregator: 360快资讯 (www.360kuai.com) is 360's own aggregation platform
- Multi-source coverage: 人民网, 中国新闻网, 澎湃新闻, 新京报, 搜狐, 界面新闻, 凤凰网, 36氪, 新浪财经

## Timestamp Filtering

- "最近2天" = filter to ≤48小时前
- 360 only shows relative hours for very recent items; older items show absolute dates
- "12分钟前" → ~2026-07-24 09:00 CST
- "10小时前" → ~2026-07-23 23:00 CST
- "2小时前" → ~2026-07-24 07:00 CST

## Output Format Used

Followed the skill's structured format:
1. Emoji + numbered heading per item
2. Time, brief content, source attribution
3. Grouped sub-items under the main event (菲尔兹奖历史性突破) instead of flat listing
4. Overall trend summary paragraph at end

## Environment Notes

- Python NOT available (Windows Store shim blocks real python.exe)
- All parsing done with grep/sed in bash
- All curl-based queries (browser GUI unreachable via cua-driver)
- URL encoding: spaces must be `%20`, not `+`