"""Custom / Ollama (local) provider profile.

Covers any endpoint registered as provider="custom", including local
Ollama instances and OpenAI-compatible reasoning endpoints (GLM-5.2 on
Volcengine ARK, vLLM, llama.cpp). Key quirks:
  - ollama_num_ctx → extra_body.options.num_ctx (local context window)
  - reasoning_config disabled → extra_body.think = False
  - reasoning_config enabled + effort → top-level reasoning_effort
    (the native OpenAI-compatible format GLM/ARK expect; unset omits it
    so the endpoint's server default applies)
  - ``/plan/`` endpoints (Volcengine ARK Plan API) expect messages under
    ``input.messages`` rather than top-level ``messages`` — extra_body
    injects ``input`` alongside the standard ``messages`` key so the
    server picks up the correct payload and the OpenAI SDK validation
    (which requires top-level ``messages``) passes.
"""

from typing import Any

from providers import register_provider
from providers.base import ProviderProfile


class CustomProfile(ProviderProfile):
    """Custom/Ollama local provider — think=false, num_ctx, and plan-API support."""

    def build_api_kwargs_extras(
        self,
        *,
        reasoning_config: dict | None = None,
        ollama_num_ctx: int | None = None,
        **ctx: Any,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        extra_body: dict[str, Any] = {}
        top_level: dict[str, Any] = {}

        # Ollama context window
        if ollama_num_ctx:
            options = extra_body.get("options", {})
            options["num_ctx"] = ollama_num_ctx
            extra_body["options"] = options

        # Reasoning / thinking control for custom OpenAI-compatible endpoints
        # (GLM-5.2 on Volcengine ARK, vLLM, Ollama, llama.cpp, …).
        #
        #   - disabled  → extra_body.think = False (Ollama's thinking-off flag)
        #   - enabled + effort set → TOP-LEVEL reasoning_effort string, the
        #     format GLM-5.2/ARK and other OpenAI-compatible reasoning APIs
        #     expect (GLM documents "high" and "max"; "max" is its default).
        #   - enabled + no effort  → omit both, so the endpoint applies its own
        #     server-side default (do NOT force a level the user didn't pick).
        #
        # We deliberately do NOT emit ``think=True`` on enable: it is an
        # Ollama-only flag and thinking is already server-default-on for these
        # backends, so forcing it risks a 400 on GLM/vLLM endpoints that don't
        # recognize it. Mirrors the DeepSeek/Zai profile precedent.
        if reasoning_config and isinstance(reasoning_config, dict):
            _effort = (reasoning_config.get("effort") or "").strip().lower()
            _enabled = reasoning_config.get("enabled", True)
            if _effort == "none" or _enabled is False:
                extra_body["think"] = False
            elif _effort:
                top_level["reasoning_effort"] = _effort

        # Volcengine ARK Plan API (/api/plan/v3): the endpoint is a standard
        # OpenAI-compatible Chat Completions endpoint (expects ``messages``),
        # but it also validates an ``input`` field at the top level — an opaque
        # string used for AFP (Agent Fuel Points) billing.  Without it the API
        # returns 400: "Missing `input.content` parameter".
        # Inject just the last user's plain text so the billing check passes.
        _base_url = (ctx.get("base_url") or "").lower()
        if "/plan/" in _base_url:
            import os as _os
            import json as _json
            import datetime as _dt
            _log_path = _os.path.join(_os.environ.get("TEMP", "C:\\temp"), "ark_plan_debug.txt")
            _messages = ctx.get("messages")
            _last_user_msg = ""
            if _messages:
                for m in reversed(_messages):
                    if isinstance(m, dict) and m.get("role") == "user":
                        _c = m.get("content")
                        if isinstance(_c, str):
                            _last_user_msg = _c
                        elif isinstance(_c, list):
                            for part in _c:
                                if isinstance(part, dict) and part.get("type") == "text":
                                    _last_user_msg = part.get("text", "")
                                    break
                        if _last_user_msg:
                            break
            extra_body["input"] = {"content": _last_user_msg or "."}
            with open(_log_path, "a") as _f:
                _f.write("[%s] ARK PLAN: input=%s msgs_present=%s base_url=%s ctx_keys=%s\n" % (_dt.datetime.now().isoformat(), _last_user_msg or ".", "yes" if _messages else "no", _base_url, list(ctx.keys())))

        return extra_body, top_level

    def fetch_models(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 8.0,
    ) -> list[str] | None:
        """Custom/Ollama: base_url is user-configured; fetch if set."""
        if not (base_url or self.base_url):
            return None
        return super().fetch_models(api_key=api_key, base_url=base_url, timeout=timeout)


custom = CustomProfile(
    name="custom",
    aliases=(
        "ollama",
        "local",
        "vllm",
        "llamacpp",
        "llama.cpp",
        "llama-cpp",
    ),
    env_vars=(),  # No fixed key — custom endpoint
    base_url="",  # User-configured
    # Without this, no max_tokens is sent and Ollama falls back to its internal
    # num_predict=128, truncating responses after a few tokens (#39281). This is
    # only a floor used when the user hasn't set model.max_tokens — they can
    # override per-model — so we set it generously rather than lowballing it.
    default_max_tokens=65536,
)

register_provider(custom)
