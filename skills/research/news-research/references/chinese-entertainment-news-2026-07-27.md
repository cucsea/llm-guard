# Chinese Entertainment News — Session Reference (2026-07-27)

## Task

Summarize important events in Chinese entertainment over the past 48 hours and save to a .docx on the desktop.

## Data Sources Used (in order of reliability)

### 1. Baidu Hot List API (best)

```
GET https://top.baidu.com/api/board?tab=realtime
Headers: User-Agent: Mozilla/5.0, Referer: https://top.baidu.com/
```

Returns `{"success":true,"data":{"cards":[{"component":"hotList","content":[...]}]}}`.

Each content item:
- `word` — hot search title
- `desc` — description/summary
- `hotScore` — numeric popularity score
- `query` — search query string
- `hotTag` — 0=none, 3=hot

Entertainment keywords to filter by: 电影, 明星, 演员, 导演, 综艺, 剧, 歌手, 演唱会, 娱乐, 票房, 音乐, 舞台, 粉丝, 艺人, 影视, 动画, 动漫, 戏, 春晚, 喜剧, 演技, 群星, 撤档, 上映, 热播, 收视, 首映, 预告, 片, 节目

### 2. Sina Feed API (good for categorized news)

```
GET https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2510&k=&num=20&page=1
Headers: User-Agent: Mozilla/5.0
```

Lid values tried:
- 2516 — finance/general
- 2510 — mixed (entertainment, sports, general) ← best for entertainment
- 2509 — finance/markets
- 10 — entertainment (returned empty)

### 3. 360 Search — not needed this session (APIs above sufficed)

## Key Findings (July 25-27, 2026)

| Rank | Event | Hot Score |
|------|-------|-----------|
| 1 | 电影《群星闪耀时》突然宣布撤档 | 7,712,490 |
| 2 | AI冲击短剧行业 "戏王"也扛不住了 | 7,423,874 |
| 3 | 动画片比真人电影更火了吗 | 6,464,609 |
| 4 | 多部电影撤出暑期档 | 4,477,334 |
| 5 | 电影《八仙！》让山东蓬莱爆火 | 3,335,475 |
| — | 又一女生称被gmm工作人员污蔑插队 | (on hot list) |
| — | "昆凌"是昆凌的姓 | (on hot list) |
| — | 黄日华否认"全面复出" | (on hot list) |

## Output

Created `C:\Users\Allen\Desktop\政府\娱乐_中国娱乐界近48小时要闻总结.docx` via `execute_code` using python-docx (embedded Hermes Python).

## Lessons for Future Sessions

1. **Baidu Hot List API is the #1 source** — no captcha, structured JSON, real-time. Start here.
2. **Sina Feed lid=2510** is the best entertainment-adjacent feed. Other lids are finance-heavy.
3. **execute_code with python-docx** is the fastest path to a formatted .docx. No need for PowerShell OOXML workarounds.
4. **python-docx handles Chinese paths** natively — `doc.save()` works directly.
5. The embedded Python at `D:\llm-safe\hermes-agent\python_embedded\python.exe` has python-docx, urllib, json — everything needed for this workflow.
