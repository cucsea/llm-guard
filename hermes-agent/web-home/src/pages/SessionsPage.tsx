import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw,
  Search,
  Eye,
  Pencil,
  Download,
  Trash2,
  MessageSquarePlus,
} from "lucide-react";
import {
  api,
  type SessionRow,
  type SessionsResponse,
  type SessionMessage,
} from "@/lib/api";
import { useT } from "@/i18n";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/States";
import { Drawer, Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Markdown } from "@/components/Markdown";
import { toast } from "@/components/ui/Toast";

function normalize(
  data: SessionsResponse | SessionRow[] | undefined,
): SessionRow[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.sessions ?? [];
}

function fmtTime(v: unknown): string {
  if (v == null || v === "") return "—";
  let d: Date;
  if (typeof v === "number") d = new Date(v < 1e12 ? v * 1000 : v);
  else d = new Date(String(v));
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

export function SessionsPage() {
  const t = useT();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<SessionRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SessionRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [clearAllPassword, setClearAllPassword] = useState("");
  const [clearAllPasswordError, setClearAllPasswordError] = useState("");

  const stats = useQuery({
    queryKey: ["session-stats"],
    queryFn: api.sessionStats,
  });
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.sessions({ limit: 200, order: "recent" }),
  });

  const rows = useMemo(() => {
    const all = normalize(data);
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter((s) =>
      [s.title, s.id, s.model, s.cwd, s.preview]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(term)),
    );
  }, [data, q]);

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteSession(id),
    onSuccess: () => {
      toast("success", t("sessions.deleted"));
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["session-stats"] });
    },
    onError: (e) => toast("error", (e as Error).message),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (ids: string[]) => api.bulkDeleteSessions(ids),
    onSuccess: () => {
      toast("success", `已删除 ${selectedIds.size} 个会话`);
      setSelectedIds(new Set());
      setDeleteSelectedOpen(false);
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["session-stats"] });
    },
    onError: (e) => toast("error", (e as Error).message),
  });

  const clearAllMut = useMutation({
    mutationFn: (ids: string[]) => api.bulkDeleteSessions(ids),
    onSuccess: () => {
      toast("success", "已清空所有会话");
      setClearAllOpen(false);
      setClearAllPassword("");
      setClearAllPasswordError("");
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["session-stats"] });
    },
    onError: (e) => toast("error", (e as Error).message),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((s) => String(s.id))));
    }
  };

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;

  return (
    <>
      <PageHeader
        title={t("sessions.title")}
        subtitle={t("sessions.subtitle")}
        action={
          <Button variant="secondary" onClick={() => refetch()}>
            <RefreshCw className={"h-3.5 w-3.5" + (isFetching ? " animate-spin" : "")} />
            {t("common.refresh")}
          </Button>
        }
      />

      {stats.data ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label={t("sessions.stats.total")} value={stats.data.total ?? 0} />
          <StatCard
            label={t("sessions.stats.active")}
            value={stats.data.active_store ?? 0}
          />
          <StatCard
            label={t("sessions.stats.archived")}
            value={stats.data.archived ?? 0}
          />
          <StatCard
            label={t("sessions.stats.messages")}
            value={stats.data.messages ?? 0}
          />
        </div>
      ) : null}

      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => setDeleteSelectedOpen(true)}
          disabled={selectedIds.size === 0}
          title="删除所选会话"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-[var(--fg-muted)] transition hover:bg-[var(--bg)] hover:text-[var(--danger)] disabled:opacity-30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("sessions.searchPlaceholder")}
            className="w-full rounded-md border bg-white py-2 pl-9 pr-3 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
          />
        </div>
        {!isLoading && !isError ? (
          <span className="text-xs text-[var(--fg-muted)]">
            {t("sessions.count", { n: rows.length })}
          </span>
        ) : null}
        <button
          onClick={() => setClearAllOpen(true)}
          title="清空所有会话"
          className="ml-auto inline-flex h-9 shrink-0 items-center gap-1 rounded-md border px-2.5 text-xs font-medium text-[var(--fg-muted)] transition hover:bg-[var(--bg)] hover:text-[var(--danger)]"
        >
          <Trash2 className="h-3.5 w-3.5" />
          清空
        </button>
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : isError ? (
          <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-[var(--fg-subtle)]">
                  <th className="w-10 px-2 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 accent-[var(--primary)]"
                    />
                  </th>
                  <th className="px-5 py-3">{t("sessions.col.title")}</th>
                  <th className="px-5 py-3">{t("sessions.col.model")}</th>
                  <th className="px-5 py-3 text-right">{t("sessions.col.messages")}</th>
                  <th className="px-5 py-3">{t("sessions.col.updated")}</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const sid = String(s.id);
                  const checked = selectedIds.has(sid);
                  return (
                  <tr
                    key={sid}
                    className="group border-b last:border-0 transition hover:bg-[var(--bg)]"
                  >
                    <td className="w-10 px-2 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(sid)}
                        className="h-4 w-4 accent-[var(--primary)]"
                      />
                    </td>
                    <td
                      className="max-w-xs cursor-pointer px-5 py-3"
                      onClick={() => setDetailId(sid)}
                    >
                      <div className="truncate font-medium text-[var(--fg)]">
                        {s.title || (s.preview ? s.preview.slice(0, 15) + "…" : t("sessions.untitled"))}
                      </div>
                      <div className="truncate font-mono text-[11px] text-[var(--fg-subtle)]">
                        {s.id}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[var(--fg-muted)]">
                      {s.model || "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-[var(--fg-muted)]">
                      {s.message_count ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-[var(--fg-muted)]">
                      {fmtTime(s.last_active ?? s.updated_at ?? s.started_at)}
                    </td>
                    <td className="px-5 py-3">
                      <RowActions
                        session={s}
                        onView={() => setDetailId(sid)}
                        onRename={() => setRenameTarget(s)}
                        onDelete={() => setDeleteTarget(s)}
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SessionDetailDrawer
        sessionId={detailId}
        onClose={() => setDetailId(null)}
      />

      <RenameDialog
        key={renameTarget?.id ? String(renameTarget.id) : "none"}
        session={renameTarget}
        onClose={() => setRenameTarget(null)}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["sessions"] });
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(String(deleteTarget.id))}
        title={t("sessions.delete")}
        message={t("sessions.deleteConfirm")}
        confirmLabel={t("common.delete")}
        danger
        loading={deleteMut.isPending}
      />

      <ConfirmDialog
        open={deleteSelectedOpen}
        onClose={() => setDeleteSelectedOpen(false)}
        onConfirm={() => bulkDeleteMut.mutate([...selectedIds])}
        title="删除会话"
        message={`确定要删除选中的 ${selectedIds.size} 个会话吗？此操作不可撤销。`}
        confirmLabel="删除"
        danger
        loading={bulkDeleteMut.isPending}
      />

      <Modal
        open={clearAllOpen}
        onClose={() => { setClearAllOpen(false); setClearAllPassword(""); setClearAllPasswordError(""); }}
        title="清空所有会话"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setClearAllOpen(false); setClearAllPassword(""); setClearAllPasswordError(""); }}>
              取消
            </Button>
            <Button variant="danger" onClick={() => {
              if (clearAllPassword !== "1234") {
                setClearAllPasswordError("密码错误");
                return;
              }
              const allIds = rows.map((s) => String(s.id));
              clearAllMut.mutate(allIds);
            }} loading={clearAllMut.isPending}>
              清空
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-[var(--fg-muted)]">
          清空后将删除所有历史会话，此操作不可撤销。请输入 4 位数字密码确认。
        </p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={clearAllPassword}
          onChange={(e) => { setClearAllPassword(e.target.value.replace(/\D/g, "").slice(0, 4)); setClearAllPasswordError(""); }}
          placeholder="请输入密码"
          className="h-10 w-full rounded-md border bg-white px-3 text-center text-lg tracking-[0.5em] text-[var(--fg)] outline-none transition focus:border-[var(--primary)]"
          autoFocus
        />
        {clearAllPasswordError ? (
          <p className="mt-1.5 text-xs text-[var(--danger)]">{clearAllPasswordError}</p>
        ) : null}
      </Modal>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius)] border bg-[var(--panel)] px-4 py-3 shadow-[var(--shadow-card)]">
      <div className="text-[11px] uppercase tracking-wide text-[var(--fg-subtle)]">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-xl font-semibold text-[var(--fg)]">
        {value}
      </div>
    </div>
  );
}

function RowActions({
  session,
  onView,
  onRename,
  onDelete,
}: {
  session: SessionRow;
  onView: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const id = String(session.id);
  return (
    <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
      <IconBtn title={t("sessions.openInChat")} onClick={() => navigate(`/chat?resume=${id}`)}>
        <MessageSquarePlus className="h-4 w-4" />
      </IconBtn>
      <IconBtn title={t("sessions.view")} onClick={onView}>
        <Eye className="h-4 w-4" />
      </IconBtn>
      <IconBtn title={t("sessions.rename")} onClick={onRename}>
        <Pencil className="h-4 w-4" />
      </IconBtn>
      <a
        href={api.exportSessionUrl(id)}
        title={t("sessions.export")}
        className="rounded-md p-1.5 text-[var(--fg-muted)] transition hover:bg-[var(--border)] hover:text-[var(--fg)]"
      >
        <Download className="h-4 w-4" />
      </a>
      <IconBtn title={t("sessions.delete")} onClick={onDelete} danger>
        <Trash2 className="h-4 w-4" />
      </IconBtn>
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={
        "rounded-md p-1.5 transition hover:bg-[var(--border)] " +
        (danger
          ? "text-[var(--fg-muted)] hover:text-[var(--danger)]"
          : "text-[var(--fg-muted)] hover:text-[var(--fg)]")
      }
    >
      {children}
    </button>
  );
}

function RenameDialog({
  session,
  onClose,
  onDone,
}: {
  session: SessionRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const [title, setTitle] = useState(session?.title ? String(session.title) : "");
  const mut = useMutation({
    mutationFn: (t: string) => api.renameSession(String(session!.id), t),
    onSuccess: () => {
      toast("success", t("sessions.renamed"));
      onDone();
      onClose();
    },
    onError: (e) => toast("error", (e as Error).message),
  });

  return (
    <Modal
      open={!!session}
      onClose={onClose}
      title={t("sessions.renameTitle")}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" loading={mut.isPending} onClick={() => mut.mutate(title)}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("sessions.renamePlaceholder")}
        className="w-full rounded-md border bg-white px-3 py-2 text-sm text-[var(--fg)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
      />
    </Modal>
  );
}

function SessionDetailDrawer({
  sessionId,
  onClose,
}: {
  sessionId: string | null;
  onClose: () => void;
}) {
  const t = useT();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["session-messages", sessionId],
    queryFn: () => api.sessionMessages(sessionId!),
    enabled: !!sessionId,
  });

  const messages = data?.messages ?? [];

  return (
    <Drawer open={!!sessionId} onClose={onClose} title={t("sessions.detailTitle")}>
      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} />
      ) : messages.length === 0 ? (
        <EmptyState message={t("sessions.noMessages")} />
      ) : (
        <div className="space-y-4">
          {messages.map((m, i) => (
            <MessageRow key={m.id ?? i} msg={m} />
          ))}
        </div>
      )}
    </Drawer>
  );
}

function roleLabel(role: string, t: ReturnType<typeof useT>): string {
  if (role === "user") return t("sessions.role.user");
  if (role === "assistant") return t("sessions.role.assistant");
  if (role === "system") return t("sessions.role.system");
  if (role === "tool") return t("sessions.role.tool");
  return role;
}

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

function MessageRow({ msg }: { msg: SessionMessage }) {
  const t = useT();
  const text = contentToText(msg.content);
  const isUser = msg.role === "user";
  const isSystem = msg.role === "system";
  const isTool = msg.role === "tool";

  return (
    <div className="rounded-[var(--radius)] border bg-[var(--bg)] p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            background: isUser
              ? "var(--primary-soft)"
              : isTool
                ? "#fef3c7"
                : "var(--panel)",
            color: isUser ? "var(--primary)" : "var(--fg-muted)",
            border: "1px solid var(--border)",
          }}
        >
          {roleLabel(msg.role, t)}
        </span>
        {msg.tool_name ? (
          <span className="font-mono text-[11px] text-[var(--fg-subtle)]">
            {String(msg.tool_name)}
          </span>
        ) : null}
      </div>
      {text ? (
        isSystem || isTool ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-xs text-[var(--fg-muted)]">
            {text}
          </pre>
        ) : (
          <div className="text-[var(--fg)]">
            <Markdown content={text} />
          </div>
        )
      ) : (
        <span className="text-xs text-[var(--fg-subtle)]">—</span>
      )}
    </div>
  );
}
