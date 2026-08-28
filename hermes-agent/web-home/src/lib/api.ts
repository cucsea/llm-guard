/*
 * Minimal API client for Jizhi Home.
 *
 * Reuses the dashboard's auth contract: the Python backend injects a one-shot
 * token as ``window.__HERMES_SESSION_TOKEN__`` into index.html, and protected
 * ``/api/*`` endpoints expect it back in the ``X-Hermes-Session-Token`` header.
 * A reverse-proxy prefix may be injected as ``window.__HERMES_BASE_PATH__``.
 */

declare global {
  interface Window {
    __HERMES_SESSION_TOKEN__?: string;
    __HERMES_BASE_PATH__?: string;
  }
}

const SESSION_HEADER = "X-Hermes-Session-Token";

function readBasePath(): string {
  if (typeof window === "undefined") return "";
  const raw = window.__HERMES_BASE_PATH__ ?? "";
  if (!raw) return "";
  const withLead = raw.startsWith("/") ? raw : `/${raw}`;
  return withLead.replace(/\/+$/, "");
}

const BASE = readBasePath();

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = window.__HERMES_SESSION_TOKEN__;
  if (token && !headers.has(SESSION_HEADER)) {
    headers.set(SESSION_HEADER, token);
  }
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${BASE}${url}`, {
    ...init,
    headers,
    credentials: init?.credentials ?? "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  const ctype = res.headers.get("content-type") ?? "";
  if (ctype.includes("application/json")) return res.json() as Promise<T>;
  return res.text() as unknown as Promise<T>;
}

// ── Domain types (read-only slices used by phase 1-2 pages) ───────────

export interface SessionRow {
  id: string;
  title?: string;
  preview?: string;
  created_at?: number | string;
  updated_at?: number | string;
  message_count?: number;
  model?: string;
  cwd?: string;
  source?: string;
  archived?: boolean;
  [key: string]: unknown;
}

export interface SessionsResponse {
  sessions?: SessionRow[];
  total?: number;
  [key: string]: unknown;
}

export interface ModelInfo {
  model: string;
  provider: string;
  auto_context_length: number;
  config_context_length: number;
  effective_context_length: number;
  capabilities: Record<string, unknown>;
  [key: string]: unknown;
}

export type ConfigMap = Record<string, unknown>;

export interface ConfigSchemaField {
  key: string;
  label?: string;
  type?: string;
  category?: string;
  description?: string;
  [key: string]: unknown;
}

export interface ConfigSchema {
  fields: ConfigSchemaField[] | Record<string, ConfigSchemaField>;
  category_order?: string[];
}

export interface SkillRow {
  name: string;
  description?: string;
  category?: string;
  enabled?: boolean;
  usage?: number;
  provenance?: string;
  [key: string]: unknown;
}

export interface PluginRow {
  name: string;
  label?: string;
  description?: string;
  icon?: string;
  version?: string;
  source?: string;
  has_api?: boolean;
  [key: string]: unknown;
}

export interface HubAgentPluginRow {
  name: string;
  version?: string;
  description?: string;
  source?: string;
  runtime_status?: "disabled" | "enabled" | "inactive";
  has_dashboard_manifest?: boolean;
  path?: string;
  can_remove?: boolean;
  can_update_git?: boolean;
  auth_required?: boolean;
  auth_command?: string;
  user_hidden?: boolean;
  [key: string]: unknown;
}

export interface PluginsHubResponse {
  plugins: HubAgentPluginRow[];
  orphan_dashboard_plugins?: PluginRow[];
  providers?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ToolsetRow {
  name: string;
  label?: string;
  description?: string;
  enabled?: boolean;
  available?: boolean;
  configured?: boolean;
  tools?: string[];
  [key: string]: unknown;
}

export interface SessionStats {
  total?: number;
  active_store?: number;
  archived?: number;
  messages?: number;
  by_source?: Record<string, number>;
  [key: string]: unknown;
}

export interface SessionMessage {
  id?: number | string;
  role: string;
  content?: unknown;
  tool_name?: string;
  tool_calls?: unknown;
  reasoning?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export interface ModelProviderOption {
  slug: string;
  name: string;
  is_current?: boolean;
  is_user_defined?: boolean;
  models?: string[];
  total_models?: number;
  source?: string;
  authenticated?: boolean;
  auth_type?: string;
  warning?: string;
  capabilities?: Record<string, { fast?: boolean; reasoning?: boolean }>;
  [key: string]: unknown;
}

export interface ModelOptionsResponse {
  providers: ModelProviderOption[];
  model?: string;
  provider?: string;
  [key: string]: unknown;
}

export interface AuxiliaryTask {
  task: string;
  provider: string;
  model: string;
  base_url?: string;
}

export interface AuxiliaryResponse {
  tasks: AuxiliaryTask[];
  main: { provider: string; model: string };
}

export interface SkillContent {
  name: string;
  content: string;
  path?: string;
}

export interface SetModelBody {
  scope: "main" | "auxiliary";
  provider: string;
  model: string;
  task?: string;
  base_url?: string;
  api_key?: string;
  confirm_expensive_model?: boolean;
  profile?: string;
}

export const api = {
  status: () => apiFetch<Record<string, unknown>>("/api/status"),
  sessions: (params?: Record<string, string | number | boolean>) => {
    const qs = params
      ? "?" +
        Object.entries(params)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";
    return apiFetch<SessionsResponse | SessionRow[]>(`/api/sessions${qs}`);
  },
  session: (id: string) =>
    apiFetch<Record<string, unknown>>(`/api/sessions/${encodeURIComponent(id)}`),
  sessionMessages: (id: string) =>
    apiFetch<{ messages: SessionMessage[] }>(
      `/api/sessions/${encodeURIComponent(id)}/messages`,
    ),
  sessionStats: () => apiFetch<SessionStats>("/api/sessions/stats"),
  renameSession: (id: string, title: string) =>
    apiFetch<{ ok: boolean; title: string }>(
      `/api/sessions/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify({ title }) },
    ),
  deleteSession: (id: string) =>
    apiFetch<unknown>(`/api/sessions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  bulkDeleteSessions: (ids: string[]) =>
    apiFetch<{ ok: boolean; deleted: number }>("/api/sessions/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  searchSessions: (q: string) =>
    apiFetch<SessionsResponse | SessionRow[]>(
      `/api/sessions/search?q=${encodeURIComponent(q)}`,
    ),
  exportSessionUrl: (id: string) =>
    `${BASE}/api/sessions/${encodeURIComponent(id)}/export`,
  modelInfo: () => apiFetch<ModelInfo>("/api/model/info"),
  modelOptions: () =>
    apiFetch<ModelOptionsResponse>(
      "/api/model/options?include_unconfigured=1",
    ),
  modelAuxiliary: () => apiFetch<AuxiliaryResponse>("/api/model/auxiliary"),
  setModel: (body: SetModelBody) =>
    apiFetch<{ ok: boolean; [k: string]: unknown }>("/api/model/set", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  config: () => apiFetch<ConfigMap>("/api/config"),
  configSchema: () => apiFetch<ConfigSchema>("/api/config/schema"),
  skills: () => apiFetch<SkillRow[]>("/api/skills"),
  skillContent: (name: string) =>
    apiFetch<SkillContent>(
      `/api/skills/content?name=${encodeURIComponent(name)}`,
    ),
  toggleSkill: (name: string, enabled: boolean) =>
    apiFetch<{ ok: boolean }>("/api/skills/toggle", {
      method: "PUT",
      body: JSON.stringify({ name, enabled }),
    }),
  plugins: () => apiFetch<PluginRow[]>("/api/dashboard/plugins"),
  pluginsHub: () =>
    apiFetch<PluginsHubResponse>("/api/dashboard/plugins/hub"),
  toolsets: () => apiFetch<ToolsetRow[]>("/api/tools/toolsets"),
  toolsetConfig: (name: string) =>
    apiFetch<Record<string, unknown>>(
      `/api/tools/toolsets/${encodeURIComponent(name)}/config`,
    ),
  rescanPlugins: () =>
    apiFetch<{ ok: boolean; count: number }>(
      "/api/dashboard/plugins/rescan",
    ),
  enableAgentPlugin: (name: string) =>
    apiFetch<unknown>(
      `/api/dashboard/agent-plugins/${name}/enable`,
      { method: "POST" },
    ),
  disableAgentPlugin: (name: string) =>
    apiFetch<unknown>(
      `/api/dashboard/agent-plugins/${name}/disable`,
      { method: "POST" },
    ),
  updateAgentPlugin: (name: string) =>
    apiFetch<unknown>(
      `/api/dashboard/agent-plugins/${name}/update`,
      { method: "POST" },
    ),
  removeAgentPlugin: (name: string) =>
    apiFetch<unknown>(`/api/dashboard/agent-plugins/${name}`, {
      method: "DELETE",
    }),
};

// ── File upload ──────────────────────────────────────────────────────

export async function uploadChatImage(
  file: File,
  signal?: AbortSignal,
): Promise<{ ok: boolean; path: string; name: string; bytes: number; mime_type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data_url = reader.result as string;
        const res = await apiFetch<{ ok: boolean; path: string; name: string; bytes: number; mime_type: string }>(
          "/api/chat/image-upload",
          { method: "POST", body: JSON.stringify({ data_url, filename: file.name }), signal },
        );
        resolve(res);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function uploadFile(
  file: File,
  signal?: AbortSignal,
): Promise<{ ok: boolean; path: string; name: string; bytes: number }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("path", file.name);
  formData.append("overwrite", "false");

  const token = window.__HERMES_SESSION_TOKEN__;
  const headers = new Headers();
  if (token) headers.set(SESSION_HEADER, token);
  // Do NOT set Content-Type; fetch will set multipart boundary automatically.

  const res = await fetch(`${BASE}/api/files/upload-stream`, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text || res.statusText);
  }
  const data = await res.json();
  return { ok: true, path: data.path, name: file.name, bytes: file.size };
}

// ── Chat SSE streaming ────────────────────────────────────────────────
//
// POST /api/home/chat/stream returns a text/event-stream. We use fetch +
// ReadableStream (not native EventSource) so we can attach the
// X-Hermes-Session-Token header, which EventSource cannot set.

export interface AttachmentRef {
  type: "image" | "file";
  path: string;
  name: string;
  mime_type?: string;
}

export interface ChatStreamHandlers {
  onSession?: (sessionId: string) => void;
  onDelta?: (text: string) => void;
  onReasoning?: (text: string) => void;
  onTool?: (phase: string, name: string, preview?: string) => void;
  onClarify?: (data: { clarify_id: string; question: string; choices?: string[] }) => void;
  onDone?: (data: {
    session_id: string;
    text: string;
    status: string;
    usage?: Record<string, unknown>;
  }) => void;
  onError?: (message: string) => void;
}

export async function streamChat(
  params: { message: string; session_id?: string; profile?: string; attachments?: AttachmentRef[] },
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = window.__HERMES_SESSION_TOKEN__;
  if (token) headers.set(SESSION_HEADER, token);

  const res = await fetch(`${BASE}/api/home/chat/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
    credentials: "include",
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text || res.statusText);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (event: string, dataRaw: string) => {
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(dataRaw);
    } catch {
      return;
    }
    switch (event) {
      case "session":
        handlers.onSession?.(String(data.session_id ?? ""));
        break;
      case "delta":
        handlers.onDelta?.(String(data.text ?? ""));
        break;
      case "reasoning":
        handlers.onReasoning?.(String(data.text ?? ""));
        break;
      case "clarify":
        handlers.onClarify?.({
          clarify_id: String(data.clarify_id ?? ""),
          question: String(data.question ?? ""),
          choices: Array.isArray(data.choices) ? data.choices.map(String) : undefined,
        });
        break;
      case "tool":
        handlers.onTool?.(
          String(data.phase ?? ""),
          String(data.name ?? ""),
          data.preview ? String(data.preview) : undefined,
        );
        break;
      case "done":
        handlers.onDone?.(data as never);
        break;
      case "error":
        handlers.onError?.(String(data.message ?? "error"));
        break;
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE frames are separated by a blank line.
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let event = "message";
      const dataLines: string[] = [];
      for (const line of raw.split("\n")) {
        if (line.startsWith(":")) continue; // keepalive comment
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length) dispatch(event, dataLines.join("\n"));
    }
  }
}

export async function resolveClarify(
  clarifyId: string,
  response: string,
  sessionId?: string,
): Promise<void> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = window.__HERMES_SESSION_TOKEN__;
  if (token) headers.set(SESSION_HEADER, token);

  const res = await fetch(`${BASE}/api/home/chat/clarify/resolve`, {
    method: "POST",
    headers,
    body: JSON.stringify({ clarify_id: clarifyId, response, session_id: sessionId }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, await res.text().catch(() => res.statusText));
  }
}
