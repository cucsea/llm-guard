#!/usr/bin/env python3
"""
Dify Knowledge Base Tool

Queries a Dify knowledge base (dataset) via the external API to retrieve
relevant document chunks. Used by Hermes as an external knowledge source.
"""

import json
import logging
import os
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)

DIFY_BASE_URL = os.getenv("DIFY_BASE_URL", "http://localhost").rstrip("/")
DIFY_API_KEY = os.getenv("DIFY_API_KEY", "")
DIFY_DATASET_ID = os.getenv("DIFY_DATASET_ID", "")

MAX_CONTENT_CHARS = 2000
MAX_RESPONSE_CHARS = 8000


def _check_config() -> bool:
    return bool(DIFY_API_KEY and DIFY_DATASET_ID)


def dify_knowledge_search(
    query: str,
    top_k: int = 5,
    search_method: str = "hybrid_search",
    score_threshold: float = 0.0,
    reranking_enable: bool = True,
) -> str:
    """Search the Dify knowledge base for relevant chunks."""
    if not _check_config():
        return json.dumps({
            "error": "Dify knowledge base not configured. Set DIFY_API_KEY and DIFY_DATASET_ID in .env",
        }, ensure_ascii=False)

    top_k = max(1, min(10, top_k))

    payload = {
        "query": query,
        "retrieval_model": {
            "search_method": search_method,
            "top_k": top_k,
            "score_threshold_enabled": score_threshold > 0,
            "score_threshold": score_threshold,
            "reranking_enable": reranking_enable,
        },
    }

    url = f"{DIFY_BASE_URL}/v1/datasets/{DIFY_DATASET_ID}/retrieve"
    headers = {
        "Authorization": f"Bearer {DIFY_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return json.dumps({
            "error": f"Dify API HTTP {e.code}",
            "detail": body[:500],
        }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({
            "error": f"Dify API request failed: {str(e)}",
        }, ensure_ascii=False)

    records = data.get("records", [])
    if not records:
        return json.dumps({
            "query": query,
            "results": [],
            "message": "No relevant chunks found in knowledge base.",
        }, ensure_ascii=False)

    results = []
    total_chars = 0
    for r in records:
        segment = r.get("segment", {})
        content = segment.get("content", "")
        doc_info = segment.get("document", {})
        score = r.get("score", 0)

        if len(content) > MAX_CONTENT_CHARS:
            content = content[:MAX_CONTENT_CHARS] + "..."

        entry = {
            "content": content,
            "score": round(score, 4),
            "document": doc_info.get("name", "unknown"),
            "position": segment.get("position", 0),
        }
        results.append(entry)
        total_chars += len(content)

        if total_chars >= MAX_RESPONSE_CHARS:
            break

    return json.dumps({
        "query": query,
        "total_found": len(records),
        "returned": len(results),
        "results": results,
    }, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------
from tools.registry import registry

DIFY_KNOWLEDGE_SCHEMA = {
    "name": "dify_knowledge_search",
    "description": (
        "Search the Dify knowledge base for relevant document chunks. "
        "Use this tool when you need domain-specific knowledge, product documentation, "
        "or contextual information from the knowledge base. "
        "Returns ranked text chunks with relevance scores."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query — what you want to find in the knowledge base.",
            },
            "top_k": {
                "type": "integer",
                "description": "Maximum number of chunks to return (1-10). Default 5.",
                "minimum": 1,
                "maximum": 10,
                "default": 5,
            },
            "search_method": {
                "type": "string",
                "description": "Search method: 'hybrid_search' (default, recommended), 'semantic_search', or 'full_text_search'.",
                "enum": ["hybrid_search", "semantic_search", "full_text_search"],
                "default": "hybrid_search",
            },
            "score_threshold": {
                "type": "number",
                "description": "Minimum relevance score 0.0-1.0. 0 = return all results. Default 0.",
                "minimum": 0,
                "maximum": 1,
                "default": 0,
            },
        },
        "required": ["query"],
    },
}

registry.register(
    name="dify_knowledge_search",
    toolset="web",
    schema=DIFY_KNOWLEDGE_SCHEMA,
    handler=lambda args, **kw: dify_knowledge_search(
        query=args.get("query", ""),
        top_k=args.get("top_k", 5),
        search_method=args.get("search_method", "hybrid_search"),
        score_threshold=args.get("score_threshold", 0.0),
        reranking_enable=True,
    ),
    check_fn=_check_config,
    requires_env=["DIFY_API_KEY", "DIFY_DATASET_ID"],
    emoji="📚",
    max_result_size_chars=100_000,
)
TOOL_EOF
