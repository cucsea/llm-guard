import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Sparkles, FileText } from "lucide-react";
import { api, type SkillRow } from "@/lib/api";
import { useT } from "@/i18n";
import type { TranslationKey } from "@/i18n/en";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/States";
import { Modal } from "@/components/ui/Modal";
import { Markdown } from "@/components/Markdown";
import { toast } from "@/components/ui/Toast";

function provenanceKey(p?: string): TranslationKey {
  if (p === "hub") return "skills.provenance.hub";
  if (p === "bundled") return "skills.provenance.bundled";
  return "skills.provenance.agent";
}

export function SkillsPage() {
  const t = useT();
  const [q, setQ] = useState("");
  const [viewSkill, setViewSkill] = useState<SkillRow | null>(null);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["skills"],
    queryFn: api.skills,
  });

  const grouped = useMemo(() => {
    const all = data ?? [];
    const term = q.trim().toLowerCase();
    const filtered = term
      ? all.filter((s) =>
          [s.name, s.description, s.category]
            .filter(Boolean)
            .some((f) => String(f).toLowerCase().includes(term)),
        )
      : all;
    const groups = new Map<string, SkillRow[]>();
    for (const s of filtered) {
      const cat = s.category || "__uncat__";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(s);
    }
    return { groups: [...groups.entries()].sort(), total: filtered.length };
  }, [data, q]);

  return (
    <>
      <PageHeader title={t("skills.title")} subtitle={t("skills.subtitle")} />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("skills.searchPlaceholder")}
            className="w-full rounded-md border bg-white py-2 pl-9 pr-3 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
          />
        </div>
        {!isLoading && !isError ? (
          <span className="text-xs text-[var(--fg-muted)]">
            {t("skills.count", { n: grouped.total })}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : grouped.total === 0 ? (
        <Card>
          <EmptyState />
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.groups.map(([cat, skills]) => (
            <div key={cat}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--fg-subtle)]">
                {cat === "__uncat__" ? t("skills.uncategorized") : cat}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {skills.map((s) => (
                  <SkillCard
                    key={s.name}
                    skill={s}
                    onView={() => setViewSkill(s)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <SkillContentDialog
        skill={viewSkill}
        onClose={() => setViewSkill(null)}
      />
    </>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:opacity-50"
      style={{ background: checked ? "var(--primary)" : "var(--border-strong)" }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition"
        style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function SkillCard({
  skill,
  onView,
}: {
  skill: SkillRow;
  onView: () => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const enabled = skill.enabled !== false;

  const toggle = useMutation({
    mutationFn: () => api.toggleSkill(skill.name, !enabled),
    onSuccess: () => {
      toast("success", t("skills.toggled"));
      qc.invalidateQueries({ queryKey: ["skills"] });
    },
    onError: (e) => toast("error", (e as Error).message || t("skills.toggleFailed")),
  });

  return (
    <div className="flex flex-col rounded-[var(--radius)] border bg-[var(--panel)] p-4 shadow-[var(--shadow-card)] transition hover:border-[var(--border-strong)]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: "var(--primary)" }} />
          <span className="break-all font-mono text-sm font-semibold text-[var(--fg)]">
            {skill.name}
          </span>
        </div>
        <Toggle
          checked={enabled}
          disabled={toggle.isPending}
          onChange={() => toggle.mutate()}
        />
      </div>
      {skill.description ? (
        <p className="mb-3 line-clamp-2 text-xs text-[var(--fg-muted)]">
          {skill.description}
        </p>
      ) : null}
      <div className="mt-auto flex items-center gap-2">
        <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-[var(--fg-muted)]">
          {t(provenanceKey(skill.provenance))}
        </span>
        {typeof skill.usage === "number" && skill.usage > 0 ? (
          <span className="text-[10px] text-[var(--fg-subtle)]">
            {t("skills.used", { n: skill.usage })}
          </span>
        ) : null}
        <button
          onClick={onView}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--primary)] transition hover:bg-[var(--primary-soft)]"
        >
          <FileText className="h-3 w-3" />
          {t("skills.viewContent")}
        </button>
      </div>
    </div>
  );
}

function SkillContentDialog({
  skill,
  onClose,
}: {
  skill: SkillRow | null;
  onClose: () => void;
}) {
  const t = useT();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["skill-content", skill?.name],
    queryFn: () => api.skillContent(skill!.name),
    enabled: !!skill,
  });

  return (
    <Modal
      open={!!skill}
      onClose={onClose}
      title={skill?.name}
      size="xl"
    >
      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} />
      ) : data ? (
        <>
          {data.path ? (
            <p className="mb-3 break-all font-mono text-[11px] text-[var(--fg-subtle)]">
              {data.path}
            </p>
          ) : null}
          <Markdown content={data.content || ""} />
        </>
      ) : (
        <p className="text-sm text-[var(--fg-muted)]">{t("skills.viewContent")}</p>
      )}
    </Modal>
  );
}
