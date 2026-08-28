# Multi-Query Batch Parsing with 360 Search (2026-07-24)

## Context

Session searching Chinese mathematics news. Key constraints:
- Python is **unavailable** on this Windows MSYS environment (Windows Store shim blocks it)
- Terminal's cwd was broken; use `workdir=/tmp` on every call
- Browser GUI (Edge) was unreachable via cua-driver, so all search was curl-based

## Winning Approach: Bash grep/sed Multi-Query Pipeline

This is the **reliable approach** for this environment. Python is not available.

### Step 1: Fetch multiple queries in parallel

```bash
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

# IMPORTANT: URL-encode spaces as %20, not +, for 360 search
declare -a qs=("查询1%20关键词%20A" "查询2%20关键词%20B" "查询3%20关键词%20C")

i=0
for q in "${qs[@]}"; do
  curl -s -m 25 -A "$UA" "https://www.so.com/s?q=$q" > "/tmp/r_$i.html" 2>/dev/null
  echo "$i -> $(wc -c < /tmp/r_$i.html) bytes"
  i=$((i+1))
done
```

### Step 2: Extract titles from all results

```bash
for f in /tmp/r_*.html; do
  echo "=== $f ==="
  grep -oE 'res-title"><a [^>]*>.*?</a>' "$f" \
    | sed -E 's/<[^>]+>//g' | grep -vE '^\s*$' | head -15
  echo "--- summaries ---"
  grep -oE 'res-list-summary">.*?</span>' "$f" \
    | sed -E 's/<[^>]+>//g' | grep -vE '^\s*$' | head -8
  echo
done
```

### Step 3: Extract timestamps + sources

```bash
for f in /tmp/r_*.html; do
  echo "=== $f ==="
  # Combined: titles + timestamps + summaries in one pass
  grep -oE '(res-title"><a [^>]*>.*?</a>|g-c-gray">[^<]*|res-list-summary">[^<]*)' "$f" \
    | sed -E 's/<[^>]+>//g' | grep -vE '^\s*$' | head -60
done
```

### Step 4: Re-fetch for specific subtopics

Once the main topic is identified (e.g., "王虹 邓煜 获菲尔兹奖"), run a second batch of focused queries:

```bash
declare -a qs=("人物A%20成就%20关键词" "奖项%20关键词%20详细信息")
# ... same fetch + parse pattern
```

## Python Script Approach (Legacy — Only If Python Is Available)

**Do not use this on this Windows host.** Python is not available. Use the grep/sed approach above.

## Output Synthesis

After parsing, organize results into a structured summary:
1. Group items by relevance and recency
2. Filter to ≤48小时前 for "最近2天" queries
3. Deduplicate: 360 search often returns the same article at multiple positions
4. Present with: title, time (relative or absolute), 2-3 sentence summary, source attribution