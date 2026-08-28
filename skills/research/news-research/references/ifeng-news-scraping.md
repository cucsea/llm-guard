# 凤凰网头条新闻抓取方案

## 背景

凤凰网（`ifeng.com`）是综合性中文门户，但**不提供常规RSS feed**，其多个API端点常出现DNS解析失败（如 `ifeng.isrc.ifeng.com`、`api.ifeng.com` 均返回 `getaddrinfo failed`）。因此，当Baidu/Sina聚合不可用时，直接HTML解析是可行方案。

## 有效方案

### 步骤1：访问凤凰网首页获取主条目

URL: `https://www.ifeng.com`

**提取方法**：
```python
import re
html = urllib.request.urlopen("https://www.ifeng.com", 
    headers={'User-Agent': 'Mozilla/5.0'}).read().decode('utf-8')
titles = re.findall(r'title\s*=\s*["\']([^"\']*)["\']', html)
```

**过滤条件**：
- 包含中文字符：`any('\u4e00' <= c <= '\u9fa5' for c in t)`
- 长度适中：`8 < len(t) < 120`
- 排除导航项：`'凤凰网' not in t and '首页' not in t`

**效果**：可获取前10-15条头条新闻，包括时事、国际、军事、灾害等主题。

### 步骤2：访问新闻频道补充时效条目

URL: `https://news.ifeng.com`

新闻频道页面包含更多时效性强的新闻标题，可作为首页的补充。提取方法与首页相同，但标题更新更频繁。

### 完整示例

```python
import urllib.request
import re

def fetch_ifeng_headlines():
    html = urllib.request.urlopen("https://www.ifeng.com", 
        headers={'User-Agent': 'Mozilla/5.0'}).read().decode('utf-8')
    titles = re.findall(r'title\s*=\s*["\']([^"\']*)["\']', html)
    
    filtered = []
    seen = set()
    for t in titles:
        if (any('\u4e00' <= c <= '\u9fa5' for c in t) and 
            8 < len(t) < 120 and 
            '凤凰网' not in t and 
            t not in seen):
            seen.add(t)
            filtered.append(t)
            if len(filtered) >= 15:
                break
    
    return filtered
```

## 注意事项

- **凤凰网可能反爬**：频繁访问可能导致封禁，需设置合理User-Agent和请求间隔。
- **页面结构变化**：HTML类名可能更新，需定期检查选择器是否有效。
- **无精确时间戳**：直接从首页提取的标题不包含发布时间，需结合新闻频道或单独抓取单篇页面时间。
- **作为fallback方案**：仅在Baidu API、Sina Feed等聚合方案不可用时使用。

> 本次成功案例：2026-08-27 凤凰网头条新闻抓取，通过title属性过滤获得15条有效新闻，涵盖国际外交、灾害救援、国防回应等主题。