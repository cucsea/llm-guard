import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const LAST_SESSION_KEY = "jizhi.home.lastSession";
import {
  Send,
  Square,
  Plus,
  Wrench,
  Brain,
  User,
  Bot,
  Copy,
  Check,
  History,
  MessageSquare,
  Paperclip,
  Image,
  File as FileIcon,
  X,
  Cpu,
  Settings,
} from "lucide-react";
import {
  api,
  streamChat,
  resolveClarify,
  uploadChatImage,
  uploadFile,
  type SessionRow,
  type SessionsResponse,
  type AttachmentRef,
} from "@/lib/api";
import { useT } from "@/i18n";
import { PageHeader } from "@/components/PageHeader";
import { Drawer } from "@/components/ui/Modal";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/States";
import { cn } from "@/lib/utils";

interface ToolEvent {
  id: number;
  name: string;
  phase: string;
  preview?: string;
  duration?: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  reasoning?: string;
  tools?: ToolEvent[];
  status?: "streaming" | "complete" | "error" | "interrupted";
  error?: string;
}

interface PendingAttachment {
  id: string;
  file: File;
  type: "image" | "file";
  preview?: string;
  uploaded: boolean;
  path?: string;
  uploading: boolean;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function getFileType(file: File): "image" | "file" {
  return file.type.startsWith("image/") ? "image" : "file";
}

const ACCEPTED_IMAGE_TYPES = ".png,.jpg,.jpeg,.gif,.webp,.bmp";
const ACCEPTED_DOCUMENT_TYPES = ".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.md,.csv,.json,.xml,.yaml,.yml,.log,.py,.js,.ts,.jsx,.tsx,.java,.cpp,.c,.h,.hpp,.rs,.go,.rb,.php,.sh,.bat,.ps1,.sql,.html,.css,.scss,.less,.svg,.zip";
const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
const MAX_FILE_SIZE = 80 * 1024 * 1024;
const MAX_ATTACHMENTS = 20;

function contentToText(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part)
          return String((part as { text: unknown }).text ?? "");
        return "";
      })
      .join("");
  }
  return JSON.stringify(content);
}

export function ChatPage() {
  const t = useT();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sessionRef = useRef<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toolSeqRef = useRef(0);
  const toolStartRef = useRef<Map<number, number>>(new Map());
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const [clarifyPrompt, setClarifyPrompt] = useState<{
    clarify_id: string;
    question: string;
    choices?: string[];
  } | null>(null);
  const [clarifyInput, setClarifyInput] = useState("");
  const [clarifyShowText, setClarifyShowText] = useState(false);

  // Close attachment menu on outside click
  useEffect(() => {
    if (!attachMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [attachMenuOpen]);

  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close model menu on outside click
  useEffect(() => {
    if (!modelMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [modelMenuOpen]);

  const isNearBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const max = 184;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, max) + "px";
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    autoGrow();
  }, [input, autoGrow]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadHistory = useCallback(async (sid: string) => {
    setLoadingHistory(true);
    try {
      const res = await api.sessionMessages(sid);
      const loaded: ChatMessage[] = [];
      let pending: { text: string }[] = [];
      function flushAssistant() {
        if (pending.length === 0) return;
        loaded.push({
          id: uid(),
          role: "assistant",
          text: pending
            .map((p) => p.text)
            .filter(Boolean)
            .join("\n\n"),
          status: "complete",
        });
        pending = [];
      }
      for (const m of res.messages ?? []) {
        if (m.role === "user") {
          flushAssistant();
          const text = contentToText(m.content);
          if (text.trim()) {
            loaded.push({ id: uid(), role: "user", text, status: "complete" });
          }
        } else if (m.role === "assistant") {
          const text = contentToText(m.content);
          if (text.trim()) {
            pending.push({ text });
          }
        }
      }
      flushAssistant();
      sessionRef.current = sid;
      setMessages(loaded);
    } catch {
      /* ignore; start fresh */
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Auto-resume last session on mount
  useEffect(() => {
    const resumeId = searchParams.get("resume");
    if (resumeId) {
      // Explicit ?resume= in URL — load it and save as last session
      loadHistory(resumeId);
      try { localStorage.setItem(LAST_SESSION_KEY, resumeId); } catch {}
      searchParams.delete("resume");
      setSearchParams(searchParams, { replace: true });
      return;
    }
    // No explicit resume — check localStorage for last session
    try {
      const lastId = localStorage.getItem(LAST_SESSION_KEY);
      if (lastId && !sessionRef.current) {
        loadHistory(lastId);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchAssistant = useCallback(
    (id: string, patch: (m: ChatMessage) => ChatMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? patch(m) : m)));
    },
    [],
  );

  const addFiles = useCallback((files: FileList | File[]) => {
    const entries: { file: File; type: "image" | "file"; preview?: string }[] = [];
    for (const file of Array.from(files)) {
      const type = getFileType(file);
      const maxSize = type === "image" ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
      if (file.size > maxSize) continue;
      const preview = type === "image" ? URL.createObjectURL(file) : undefined;
      entries.push({ file, type, preview });
    }
    if (entries.length === 0) return;
    setPendingAttachments((prev) => {
      const remaining = MAX_ATTACHMENTS - prev.length;
      if (remaining <= 0) return prev;
      const taken = entries.slice(0, remaining);
      return [
        ...prev,
        ...taken.map((e) => ({
          id: uid(),
          file: e.file,
          type: e.type,
          preview: e.preview,
          uploaded: false,
          uploading: false,
        })),
      ];
    });
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.preview) URL.revokeObjectURL(att.preview);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  }, [addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  }, [addFiles]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length) {
      e.preventDefault();
      addFiles(imageFiles);
    }
  }, [addFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    const hasAttachments = pendingAttachments.length > 0;
    if (!text && !hasAttachments) return;
    if (busy) return;

    const attachmentNames = pendingAttachments.map((a) => a.file.name);
    const displayText = text + (attachmentNames.length ? (text ? " " : "") + "[" + attachmentNames.join(", ") + "]" : "");
    const userMsg: ChatMessage = { id: uid(), role: "user", text: displayText };
    const asstId = uid();
    const asstMsg: ChatMessage = {
      id: asstId,
      role: "assistant",
      text: "",
      status: "streaming",
      tools: [],
    };
    setMessages((prev) => [...prev, userMsg, asstMsg]);
    setInput("");
    setBusy(true);

    // Upload pending attachments
    const controller = new AbortController();
    abortRef.current = controller;
    const attachmentRefs: AttachmentRef[] = [];

    try {
      for (const att of pendingAttachments) {
        setPendingAttachments((prev) =>
          prev.map((a) => (a.id === att.id ? { ...a, uploading: true } : a)),
        );
        try {
          if (att.type === "image") {
            const result = await uploadChatImage(att.file, controller.signal);
            attachmentRefs.push({ type: "image", path: result.path, name: result.name, mime_type: result.mime_type });
          } else {
            const result = await uploadFile(att.file, controller.signal);
            attachmentRefs.push({ type: "file", path: result.path, name: result.name });
          }
          setPendingAttachments((prev) =>
            prev.map((a) => (a.id === att.id ? { ...a, uploaded: true, uploading: false } : a)),
          );
        } catch {
          setPendingAttachments((prev) =>
            prev.map((a) => (a.id === att.id ? { ...a, uploading: false } : a)),
          );
          throw new Error(`Failed to upload attachment: ${att.file.name}`);
        }
      }
      // Clean up previews after upload
      for (const att of pendingAttachments) {
        if (att.preview) URL.revokeObjectURL(att.preview);
      }
      setPendingAttachments([]);

      await streamChat(
        {
          message: text,
          session_id: sessionRef.current,
          attachments: attachmentRefs.length > 0 ? attachmentRefs : undefined,
        },
        {
          onSession: (sid) => {
            sessionRef.current = sid;
            try { localStorage.setItem(LAST_SESSION_KEY, sid); } catch {}
          },
          onDelta: (delta) => {
            patchAssistant(asstId, (m) => ({ ...m, text: m.text + delta }));
          },
          onReasoning: (r) => {
            patchAssistant(asstId, (m) => ({
              ...m,
              reasoning: (m.reasoning ?? "") + r,
            }));
          },
          onClarify: (data) => {
            setClarifyPrompt({
              clarify_id: data.clarify_id,
              question: data.question,
              choices: data.choices,
            });
            setClarifyInput("");
            setClarifyShowText(false);
          },
          onTool: (phase, name, preview) => {
            if (phase === "start") {
              const id = toolSeqRef.current++;
              toolStartRef.current.set(id, Date.now());
              patchAssistant(asstId, (m) => ({
                ...m,
                tools: [...(m.tools ?? []), { id, name, phase, preview }],
              }));
            } else {
              patchAssistant(asstId, (m) => {
                const tools = m.tools ?? [];
                if (tools.length === 0) return m;
                for (let i = tools.length - 1; i >= 0; i--) {
                  if (tools[i].name === name && tools[i].phase === "start" && tools[i].duration === undefined) {
                    const startTime = toolStartRef.current.get(tools[i].id) ?? Date.now();
                    const updated = [...tools];
                    updated[i] = {
                      ...updated[i],
                      phase,
                      duration: Date.now() - startTime,
                    };
                    return { ...m, tools: updated };
                  }
                }
                return m;
              });
            }
          },
          onDone: (data) => {
            patchAssistant(asstId, (m) => ({
              ...m,
              text: m.text || data.text || "",
              status:
                data.status === "error"
                  ? "error"
                  : data.status === "interrupted"
                    ? "interrupted"
                    : "complete",
            }));
          },
          onError: (msg) => {
            patchAssistant(asstId, (m) => ({
              ...m,
              status: "error",
              error: msg,
            }));
          },
        },
        controller.signal,
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        patchAssistant(asstId, (m) => ({
          ...m,
          status: "interrupted",
        }));
      } else {
        patchAssistant(asstId, (m) => ({
          ...m,
          status: "error",
          error: (err as Error).message,
        }));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }, [input, busy, patchAssistant, pendingAttachments]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setBusy(false);
  }, []);

  const newChat = useCallback(() => {
    if (busy) return;
    sessionRef.current = undefined;
    setMessages([]);
    try { localStorage.removeItem(LAST_SESSION_KEY); } catch {}
  }, [busy]);

  const resumeSession = useCallback(
    (sid: string) => {
      if (busy) return;
      setDrawerOpen(false);
      loadHistory(sid);
    },
    [busy, loadHistory],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      send();
      return;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      el.setRangeText("\n", start, end, 'end');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title={t("chat.title")}
        subtitle={t("chat.subtitle")}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--fg)] transition hover:bg-white"
            >
              <History className="h-3.5 w-3.5" />
              {t("chat.sessions")}
            </button>
            <button
              onClick={newChat}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--fg)] transition hover:bg-white disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("chat.newChat")}
            </button>
          </div>
        }
      />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 space-y-4 overflow-y-auto rounded-[var(--radius)] border bg-[var(--panel)] p-5 shadow-[var(--shadow-card)]"
      >
        {loadingHistory ? (
          <Spinner />
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: "var(--primary-soft)" }}
            >
              <Bot className="h-6 w-6" style={{ color: "var(--primary)" }} />
            </div>
            <p className="text-sm font-medium text-[var(--fg)]">
              {t("chat.empty")}
            </p>
            <p className="text-xs text-[var(--fg-muted)]">
              {t("chat.emptyHint")}
            </p>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} msg={m} />)
        )}
      </div>

{/* Clarify prompt (above input, does not replace it) */}
      {clarifyPrompt && (
        <div className="mb-3 rounded-lg border-2 p-4" style={{ background: "var(--bg-elevated)", borderColor: "var(--primary)", borderLeftWidth: "4px" }}>
          <div className="mb-3 flex items-start gap-2">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: "var(--primary)" }}>?</span>
            <p className="text-sm font-semibold text-[var(--fg)]">{clarifyPrompt.question}</p>
          </div>
          {clarifyPrompt.choices && clarifyPrompt.choices.length > 0 && !clarifyShowText ? (
            <div className="flex flex-wrap gap-2">
              {clarifyPrompt.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={async () => {
                    await resolveClarify(clarifyPrompt.clarify_id, choice, sessionRef.current);
                    setClarifyPrompt(null);
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  style={{ background: "var(--primary)" }}
                >
                  {choice}
                </button>
              ))}
              <button
                onClick={() => setClarifyShowText(true)}
                className="rounded-lg border-2 px-4 py-2 text-sm font-medium transition hover:bg-[var(--bg)]"
                style={{ color: "var(--primary)", borderColor: "var(--primary)" }}
              >
                Other…
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={clarifyInput}
                onChange={(e) => setClarifyInput(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && clarifyInput.trim()) {
                    await resolveClarify(clarifyPrompt.clarify_id, clarifyInput.trim(), sessionRef.current);
                    setClarifyPrompt(null);
                    setClarifyInput("");
                    setClarifyShowText(false);
                  }
                }}
                placeholder="Type your answer…"
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition"
                style={{ background: "var(--bg)", color: "var(--fg)", borderColor: "var(--border)" }}
                autoFocus
              />
              <button
                onClick={async () => {
                  if (clarifyInput.trim()) {
                    await resolveClarify(clarifyPrompt.clarify_id, clarifyInput.trim(), sessionRef.current);
                    setClarifyPrompt(null);
                    setClarifyInput("");
                    setClarifyShowText(false);
                  }
                }}
                disabled={!clarifyInput.trim()}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-40"
                style={{ background: "var(--primary)" }}
              >
                Send
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        {/* Attachment previews */}
        {pendingAttachments.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingAttachments.map((att) => (
              <div
                key={att.id}
                className="relative flex items-center gap-1.5 rounded-lg border bg-[var(--bg-elevated)] px-2 py-1.5 pr-7 text-xs shadow-sm"
              >
                {att.type === "image" && att.preview ? (
                  <img src={att.preview} alt="" className="h-8 w-8 rounded object-cover" />
                ) : (
                  <FileIcon className="h-4 w-4 shrink-0 text-[var(--fg-muted)]" />
                )}
                <span className="max-w-[140px] truncate text-[var(--fg)]">{att.file.name}</span>
                {att.uploading ? (
                  <span className="ml-1 text-[10px] text-[var(--fg-subtle)]">…</span>
                ) : null}
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--fg-subtle)] transition hover:bg-[var(--bg)] hover:text-[var(--fg)]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2"
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* Attachment button */}
          <div className="relative" ref={attachMenuRef}>
            <button
              onClick={() => setAttachMenuOpen((v) => !v)}
              disabled={busy}
              title="上传附件"
              className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-[var(--radius)] border text-[var(--fg-muted)] transition hover:bg-[var(--bg)] hover:text-[var(--fg)] disabled:opacity-40"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            {attachMenuOpen ? (
              <div className="absolute bottom-full left-0 mb-1.5 flex w-48 flex-col overflow-hidden rounded-lg border bg-[var(--panel)] shadow-lg">
                <button
                  onClick={() => { imageInputRef.current?.click(); setAttachMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--fg)] transition hover:bg-[var(--border)] odd:bg-transparent even:bg-[var(--bg)]"
                >
                  <Image className="h-4 w-4" />
                  {t("chat.attachImage")}
                </button>
                <button
                  onClick={() => { fileInputRef.current?.click(); setAttachMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--fg)] transition hover:bg-[var(--border)] odd:bg-transparent even:bg-[var(--bg)]"
                >
                  <FileIcon className="h-4 w-4" />
                  {t("chat.attachFile")}
                </button>
              </div>
            ) : null}
          </div>

          {/* Model switch dropdown */}
          <div className="relative" ref={modelMenuRef}>
            <button
              onClick={() => setModelMenuOpen((v) => !v)}
              title="选择大模型"
              className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-[var(--radius)] border text-[var(--fg-muted)] transition hover:bg-[var(--bg)] hover:text-[var(--fg)]"
            >
              <Cpu className="h-4 w-4" />
            </button>
            {modelMenuOpen ? (
              <ModelPickerDropdown
                onClose={() => setModelMenuOpen(false)}
                onManage={() => { setModelMenuOpen(false); navigate("/models"); }}
              />
            ) : null}
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_DOCUMENT_TYPES}
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={clarifyPrompt ? "Agent is asking a question — answer below…" : t("chat.placeholder")}
            disabled={!!clarifyPrompt}
            className="min-h-[64px] max-h-[184px] flex-1 resize-none rounded-[var(--radius)] border bg-white px-4 py-3 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:opacity-50"
          />
          {busy ? (
            <button
              onClick={stop}
              title="停止推理"
              className="inline-flex h-[44px] items-center gap-1.5 rounded-[var(--radius)] border px-4 text-sm font-medium text-[var(--danger)] transition hover:bg-red-50"
            >
              <Square className="h-4 w-4" />
              {t("chat.stop")}
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim() && pendingAttachments.length === 0}
              title="发送消息"
              className="inline-flex h-[44px] items-center gap-1.5 rounded-[var(--radius)] px-4 text-sm font-medium text-white transition disabled:opacity-40"
              style={{ background: "var(--primary)" }}
            >
              <Send className="h-4 w-4" />
              {t("chat.send")}
            </button>
          )}
        </div>
      </div>

      <SessionsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onPick={resumeSession}
        activeId={sessionRef.current}
      />


    </div>
  );
}

function SessionsDrawer({
  open,
  onClose,
  onPick,
  activeId,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
  activeId?: string;
}) {
  const t = useT();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["sessions", "chat-drawer"],
    queryFn: () => api.sessions({ limit: 50 }),
    enabled: open,
  });

  const rows: SessionRow[] = Array.isArray(data)
    ? data
    : ((data as SessionsResponse | undefined)?.sessions ?? []);

  return (
    <Drawer open={open} onClose={onClose} title={t("chat.sessions")}>
      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {rows.map((s) => {
            const id = String(s.id);
            const active = activeId === id;
            return (
              <button
                key={id}
                onClick={() => onPick(id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md border p-3 text-left transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]",
                  active && "border-[var(--primary)] bg-[var(--primary-soft)]",
                )}
              >
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--fg-subtle)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[var(--fg)]">
                    {s.title || s.preview || id}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[var(--fg-subtle)]">
                    {s.source ? <span>{s.source}</span> : null}
                    {typeof s.message_count === "number" ? (
                      <span>· {s.message_count} msg</span>
                    ) : null}
                    {s.model ? <span className="truncate font-mono">· {s.model}</span> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(msg.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [msg.text]);

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
        style={{
          background: isUser
            ? "var(--fg-muted)"
            : "linear-gradient(135deg, var(--primary), var(--accent))",
        }}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          "min-w-0 max-w-[75%] space-y-2",
          isUser ? "items-end text-right" : "items-start",
        )}
      >
        <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--fg-subtle)]">
          <span>{isUser ? t("chat.you") : t("chat.assistant")}</span>
          {msg.text && msg.status !== "streaming" ? (
            <button
              onClick={copy}
              title={t("chat.copy")}
              className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] transition hover:bg-[var(--bg)] hover:text-[var(--fg)]"
            >
              {copied ? (
                <Check className="h-3 w-3" style={{ color: "var(--success)" }} />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          ) : null}
        </div>

        {msg.status === "streaming" ? (
          <div className="text-left">
            <div className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium animate-reasoning text-[var(--primary)]">
              <Brain className="h-3 w-3 animate-reasoning" />
              {msg.reasoning ? "推理中…" : "思考中…"}
            </div>
          </div>
        ) : null}

        {msg.tools && msg.tools.length > 0 ? (
          <details className="group text-left">
            <summary className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[var(--fg-muted)] hover:text-[var(--fg)]">
              <span className="transition-transform group-open:rotate-90">▸</span>
              <Wrench className="h-3 w-3" />
              {t("chat.toolCalls", { count: msg.tools.length })}
            </summary>
            <div className="mt-1.5 space-y-1">
              {msg.tools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center gap-2 rounded-md border bg-[var(--bg)] px-2.5 py-1.5"
                  title={tool.preview}
                >
                  <span
                    className={
                      tool.phase === "start"
                        ? "animate-tool-spin text-blue-500"
                        : "text-green-500"
                    }
                  >
                    {tool.phase === "start" ? "⟳" : "✓"}
                  </span>
                  <span className="font-mono text-xs font-medium text-[var(--fg)]">
                    {tool.name}
                  </span>
                  {tool.preview ? (
                    <span className="max-w-[160px] truncate text-xs text-[var(--fg-muted)]">
                      {tool.preview}
                    </span>
                  ) : null}
                  {tool.duration !== undefined ? (
                    <span className="ml-auto text-[11px] tabular-nums text-[var(--fg-subtle)]">
                      {(tool.duration / 1000).toFixed(1)}s
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {msg.text ? (
          <div
            className={cn(
              "inline-block whitespace-pre-wrap break-words rounded-[var(--radius)] px-4 py-2.5 text-left text-sm",
              isUser
                ? "bg-[var(--primary)] text-white"
                : "border bg-[var(--bg)] text-[var(--fg)]",
            )}
          >
            {msg.text}
          </div>
        ) : msg.status === "streaming" ? (
          <div className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border bg-[var(--bg)] px-4 py-2.5 text-sm text-[var(--fg-muted)]">
            <span className="flex gap-1">
              <Dot /> <Dot delay="0.2s" /> <Dot delay="0.4s" />
            </span>
          </div>
        ) : null}

        {msg.status === "error" ? (
          <div className="rounded-md border px-3 py-2 text-left text-xs" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
            {t("chat.errorPrefix")}: {msg.error}
          </div>
        ) : null}
        {msg.status === "interrupted" ? (
          <div className="text-[11px] text-[var(--warning)]">
            {t("chat.interrupted")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ModelPickerDropdown({
  onClose,
  onManage,
}: {
  onClose: () => void;
  onManage: () => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const info = useQuery({ queryKey: ["model-info"], queryFn: api.modelInfo });
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["model-options"],
    queryFn: api.modelOptions,
  });

  const setMut = useMutation({
    mutationFn: (v: { provider: string; model: string }) =>
      api.setModel({
        scope: "main",
        provider: v.provider,
        model: v.model,
        confirm_expensive_model: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["model-info"] });
      qc.invalidateQueries({ queryKey: ["model-options"] });
      onClose();
    },
  });

  const currentModel = info.data?.model ?? "";
  const currentProvider = info.data?.provider ?? "";

  const allModels = useMemo(() => {
    if (!data?.providers) return [];
    const list: { providerSlug: string; providerName: string; model: string; isCurrent: boolean; capabilities?: { fast?: boolean; reasoning?: boolean } }[] = [];
    for (const p of data.providers) {
      for (const m of p.models ?? []) {
        list.push({
          providerSlug: p.slug,
          providerName: p.name,
          model: m,
          isCurrent: p.is_current === true && m === currentModel,
          capabilities: p.capabilities?.[m],
        });
      }
    }
    return list;
  }, [data, currentModel]);

  return (
    <div
      className="absolute bottom-full left-0 mb-1.5 flex w-[420px] flex-col overflow-hidden rounded-lg border bg-[var(--panel)] shadow-lg"
    >
      {/* Current model info header */}
      <div className="border-b px-4 py-3">
        <div className="text-xs uppercase tracking-wider text-[var(--fg-subtle)]">{t("chat.switchModel")}</div>
        {currentModel ? (
          <div className="mt-0.5 truncate text-sm font-medium text-[var(--fg)]">
            <span className="font-mono">{currentProvider}/{currentModel}</span>
          </div>
        ) : (
          <div className="mt-0.5 text-sm text-[var(--fg-muted)]">{t("models.noModel")}</div>
        )}
      </div>

      {/* Model list */}
      <div className="max-h-72 min-h-[160px] overflow-y-auto">
        {isLoading ? (
          <div className="flex min-h-[160px] items-center justify-center"><Spinner /></div>
        ) : isError ? (
          <div className="px-4 py-3 text-sm text-[var(--danger)]">{(error as Error)?.message}</div>
        ) : allModels.length === 0 ? (
          <div className="px-4 py-3 text-sm text-[var(--fg-muted)]">{t("models.picker.noModels")}</div>
        ) : (
          <div>
            {allModels.map((item, i) => (
              <button
                key={`${item.providerSlug}/${item.model}`}
                disabled={setMut.isPending}
                onClick={() => setMut.mutate({ provider: item.providerSlug, model: item.model })}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition disabled:opacity-50 ${i % 2 === 0 ? "bg-transparent" : "bg-[var(--bg)]"} hover:bg-[var(--border-strong)]`}
              >
                {item.isCurrent ? (
                  <Check className="h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} />
                ) : (
                  <span className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate font-mono text-[var(--fg)]">{item.model}</span>
                <span className="shrink-0 text-xs text-[var(--fg-subtle)]">{item.providerName}</span>
                {item.capabilities?.reasoning ? (
                  <span className="shrink-0 rounded bg-[var(--bg)] px-1.5 text-[10px] text-[var(--fg-muted)]">{t("models.reasoning")}</span>
                ) : null}
                {item.capabilities?.fast ? (
                  <span className="shrink-0 rounded bg-[var(--bg)] px-1.5 text-[10px] text-[var(--fg-muted)]">{t("models.fast")}</span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Model management link */}
      <div className="border-t">
        <button
          onClick={onManage}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--fg-muted)] transition hover:bg-[var(--border-strong)] hover:text-[var(--fg)]"
        >
          <Settings className="h-4 w-4" />
          {t("chat.modelManagement")}
        </button>
      </div>
    </div>
  );
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full"
      style={{ background: "var(--fg-subtle)", animationDelay: delay }}
    />
  );
}
