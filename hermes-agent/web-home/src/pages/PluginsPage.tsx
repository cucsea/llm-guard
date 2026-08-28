import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Puzzle, Wrench, CheckCircle2, Circle, RefreshCw } from "lucide-react";
import {
  api,
  type HubAgentPluginRow,
  type ToolsetRow,
} from "@/lib/api";
import { useT } from "@/i18n";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/States";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type Tab = "plugins" | "toolsets";

export function PluginsPage() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("plugins");

  return (
    <>
      <PageHeader
        title={t("plugins.title")}
        subtitle={t("plugins.subtitle")}
        action={
          <div className="inline-flex rounded-md border p-0.5">
            {(["plugins", "toolsets"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium transition",
                  tab === v
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--fg-muted)] hover:text-[var(--fg)]",
                )}
              >
                {v === "plugins"
                  ? t("plugins.tab.plugins")
                  : t("plugins.tab.toolsets")}
              </button>
            ))}
          </div>
        }
      />
      {tab === "plugins" ? <PluginsTab /> : <ToolsetsTab />}
    </>
  );
}

function PluginsTab() {
  const t = useT();
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["plugins-hub"],
    queryFn: api.pluginsHub,
  });

  const rescan = useMutation({
    mutationFn: () => api.rescanPlugins(),
    onSuccess: () => {
      toast("success", t("plugins.rescanned"));
      qc.invalidateQueries({ queryKey: ["plugins-hub"] });
    },
    onError: (e) => toast("error", (e as Error).message || t("plugins.actionFailed")),
  });

  if (isLoading) return <Spinner />;
  if (isError)
    return <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />;
  const plugins = data?.plugins ?? [];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          variant="secondary"
          loading={rescan.isPending}
          onClick={() => rescan.mutate()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("plugins.rescan")}
        </Button>
      </div>
      {plugins.length === 0 ? (
        <Card>
          <EmptyState message={t("plugins.noPlugins")} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {plugins.map((p) => (
            <PluginCard key={p.name} plugin={p} />
          ))}
        </div>
      )}
    </>
  );
}

function statusTone(status?: string): { bg: string; color: string } {
  if (status === "enabled")
    return { bg: "var(--primary-soft)", color: "var(--primary)" };
  if (status === "disabled")
    return { bg: "#fef2f2", color: "var(--danger)" };
  return { bg: "var(--bg)", color: "var(--fg-subtle)" };
}

function PluginCard({ plugin }: { plugin: HubAgentPluginRow }) {
  const t = useT();
  const qc = useQueryClient();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const enabled = plugin.runtime_status === "enabled";
  const tone = statusTone(plugin.runtime_status);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["plugins-hub"] });

  const enableMut = useMutation({
    mutationFn: () => api.enableAgentPlugin(plugin.name),
    onSuccess: () => {
      toast("success", t("plugins.enabled"));
      invalidate();
    },
    onError: (e) => toast("error", (e as Error).message || t("plugins.actionFailed")),
  });
  const disableMut = useMutation({
    mutationFn: () => api.disableAgentPlugin(plugin.name),
    onSuccess: () => {
      toast("success", t("plugins.disabled"));
      invalidate();
    },
    onError: (e) => toast("error", (e as Error).message || t("plugins.actionFailed")),
  });
  const updateMut = useMutation({
    mutationFn: () => api.updateAgentPlugin(plugin.name),
    onSuccess: () => {
      toast("success", t("plugins.updated"));
      invalidate();
    },
    onError: (e) => toast("error", (e as Error).message || t("plugins.actionFailed")),
  });
  const removeMut = useMutation({
    mutationFn: () => api.removeAgentPlugin(plugin.name),
    onSuccess: () => {
      toast("success", t("plugins.removed"));
      setConfirmRemove(false);
      invalidate();
    },
    onError: (e) =>
      toast("error", (e as Error).message || t("plugins.actionFailed")),
  });

  const busy =
    enableMut.isPending ||
    disableMut.isPending ||
    updateMut.isPending ||
    removeMut.isPending;

  return (
    <div
      className={cn(
        "flex flex-col rounded-[var(--radius)] border bg-[var(--panel)] p-4 shadow-[var(--shadow-card)] transition hover:border-[var(--border-strong)]",
        busy && "opacity-70",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
          style={{
            background: "linear-gradient(135deg, var(--primary), var(--accent))",
          }}
        >
          <Puzzle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-sm font-semibold text-[var(--fg)]">
            {plugin.name}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[var(--fg-subtle)]">
            {plugin.version ? <span className="font-mono">v{plugin.version}</span> : null}
            {plugin.source ? <span>{plugin.source}</span> : null}
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: tone.bg, color: tone.color }}
        >
          {plugin.runtime_status || "—"}
        </span>
      </div>

      {plugin.description ? (
        <p className="mb-3 line-clamp-2 text-xs text-[var(--fg-muted)]">
          {plugin.description}
        </p>
      ) : null}

      {plugin.auth_required ? (
        <p className="mb-2 text-[10px]" style={{ color: "var(--danger)" }}>
          {t("plugins.authRequired")}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {enabled ? (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => disableMut.mutate()}
          >
            {t("plugins.disable")}
          </Button>
        ) : (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => enableMut.mutate()}
          >
            {t("plugins.enable")}
          </Button>
        )}
        {plugin.can_update_git ? (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => updateMut.mutate()}
          >
            {t("plugins.update")}
          </Button>
        ) : null}
        {plugin.can_remove ? (
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => setConfirmRemove(true)}
          >
            {t("plugins.remove")}
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => removeMut.mutate()}
        title={t("plugins.remove")}
        message={t("plugins.removeConfirm")}
        confirmLabel={t("plugins.remove")}
        danger
        loading={removeMut.isPending}
      />
    </div>
  );
}

function ToolsetsTab() {
  const [viewTools, setViewTools] = useState<ToolsetRow | null>(null);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["toolsets"],
    queryFn: api.toolsets,
  });

  if (isLoading) return <Spinner />;
  if (isError)
    return <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />;
  const toolsets = data ?? [];
  if (toolsets.length === 0)
    return (
      <Card>
        <EmptyState />
      </Card>
    );

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {toolsets.map((ts) => (
          <ToolsetCard
            key={ts.name}
            toolset={ts}
            onView={() => setViewTools(ts)}
          />
        ))}
      </div>
      <ToolsetToolsDialog
        toolset={viewTools}
        onClose={() => setViewTools(null)}
      />
    </>
  );
}

function ToolsetCard({
  toolset,
  onView,
}: {
  toolset: ToolsetRow;
  onView: () => void;
}) {
  const t = useT();
  const enabled = toolset.enabled !== false;
  const available = toolset.available !== false;
  const hasTools = !!(toolset.tools && toolset.tools.length > 0);
  return (
    <div className="flex flex-col rounded-[var(--radius)] border bg-[var(--panel)] p-4 shadow-[var(--shadow-card)] transition hover:border-[var(--border-strong)]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4" style={{ color: "var(--primary)" }} />
          <span className="text-sm font-semibold text-[var(--fg)]">
            {toolset.label || toolset.name}
          </span>
        </div>
        {enabled && available ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--success)" }} />
        ) : (
          <Circle className="h-4 w-4 shrink-0 text-[var(--fg-subtle)]" />
        )}
      </div>
      {toolset.description ? (
        <p className="mb-3 line-clamp-2 text-xs text-[var(--fg-muted)]">
          {toolset.description}
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {hasTools ? (
          <button
            onClick={onView}
            className="rounded-full border px-2 py-0.5 text-[10px] text-[var(--fg-muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            {t("plugins.tools", { n: toolset.tools!.length })}
          </button>
        ) : null}
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={
            available
              ? { background: "var(--primary-soft)", color: "var(--primary)" }
              : { background: "var(--bg)", color: "var(--fg-subtle)" }
          }
        >
          {available ? t("plugins.available") : t("plugins.unavailable")}
        </span>
        {toolset.configured ? (
          <span className="text-[10px] text-[var(--success)]">
            {t("plugins.configured")}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ToolsetToolsDialog({
  toolset,
  onClose,
}: {
  toolset: ToolsetRow | null;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <Modal
      open={!!toolset}
      onClose={onClose}
      title={`${toolset?.label || toolset?.name || ""} · ${t("plugins.toolsetTitle")}`}
      size="md"
    >
      <div className="flex flex-wrap gap-2">
        {(toolset?.tools ?? []).map((tool) => (
          <span
            key={tool}
            className="rounded-md border bg-[var(--bg)] px-2 py-1 font-mono text-xs text-[var(--fg)]"
          >
            {tool}
          </span>
        ))}
      </div>
    </Modal>
  );
}
