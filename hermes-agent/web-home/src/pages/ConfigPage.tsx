import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type ConfigMap } from "@/lib/api";
import { useT } from "@/i18n";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/States";
import { cn } from "@/lib/utils";

function fmtValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}

export function ConfigPage() {
  const t = useT();
  const [view, setView] = useState<"grouped" | "raw">("grouped");
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["config"],
    queryFn: api.config,
  });

  const cfg = (data ?? {}) as ConfigMap;
  const entries = Object.entries(cfg).filter(([k]) => !k.startsWith("_"));

  return (
    <>
      <PageHeader
        title={t("config.title")}
        subtitle={t("config.subtitle")}
        action={
          <div className="inline-flex rounded-md border p-0.5">
            {(["grouped", "raw"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium transition",
                  view === v
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--fg-muted)] hover:text-[var(--fg)]",
                )}
              >
                {v === "grouped" ? t("config.grouped") : t("config.raw")}
              </button>
            ))}
          </div>
        }
      />

      <Card>
        {isLoading ? (
          <Spinner />
        ) : isError ? (
          <ErrorState
            message={(error as Error)?.message}
            onRetry={() => refetch()}
          />
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : view === "raw" ? (
          <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed text-[var(--fg)]">
            {JSON.stringify(cfg, null, 2)}
          </pre>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-[var(--fg-subtle)]">
                  <th className="w-1/3 px-5 py-3">{t("config.key")}</th>
                  <th className="px-5 py-3">{t("config.value")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([k, v]) => (
                  <tr
                    key={k}
                    className="border-b align-top last:border-0 transition hover:bg-[var(--bg)]"
                  >
                    <td className="px-5 py-3 font-mono text-xs font-medium text-[var(--fg)]">
                      {k}
                    </td>
                    <td className="px-5 py-3">
                      <pre className="whitespace-pre-wrap break-words font-mono text-xs text-[var(--fg-muted)]">
                        {fmtValue(v)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
