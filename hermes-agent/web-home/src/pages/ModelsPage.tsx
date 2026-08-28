import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cpu, Check, ChevronRight, Search, ShieldCheck } from "lucide-react";
import {
  api,
  type ModelInfo,
  type ModelProviderOption,
  type AuxiliaryResponse,
} from "@/lib/api";
import { useT } from "@/i18n";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Spinner, ErrorState } from "@/components/ui/States";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

function fmtCtx(n: number | undefined): string {
  if (!n || n <= 0) return "—";
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

export function ModelsPage() {
  const t = useT();
  const [pickerOpen, setPickerOpen] = useState(false);
  const info = useQuery({ queryKey: ["model-info"], queryFn: api.modelInfo });
  const aux = useQuery({ queryKey: ["model-aux"], queryFn: api.modelAuxiliary });

  return (
    <>
      <PageHeader
        title={t("models.title")}
        subtitle={t("models.subtitle")}
        action={
          <Button variant="primary" onClick={() => setPickerOpen(true)}>
            <Cpu className="h-3.5 w-3.5" />
            {t("models.change")}
          </Button>
        }
      />

      {info.isLoading ? (
        <Spinner />
      ) : info.isError ? (
        <ErrorState
          message={(info.error as Error)?.message}
          onRetry={() => info.refetch()}
        />
      ) : (
        <div className="space-y-6">
          <ModelDetails data={info.data as ModelInfo} />
          {aux.data ? <AuxiliaryCard data={aux.data} /> : null}
        </div>
      )}

      <ModelPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-[var(--bg)] px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-[var(--fg-subtle)]">
        {label}
      </div>
      <div className="mt-1 font-mono text-lg font-semibold text-[var(--fg)]">
        {value}
      </div>
    </div>
  );
}

function ModelDetails({ data }: { data: ModelInfo }) {
  const t = useT();
  const caps = Object.entries(data.capabilities ?? {}).filter(
    ([, v]) => v === true,
  );

  return (
    <Card>
      <CardHeader title={t("models.current")} />
      <CardBody>
        {data.model ? (
          <>
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                style={{
                  background:
                    "linear-gradient(135deg, var(--primary), var(--accent))",
                }}
              >
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <div className="font-mono text-base font-semibold text-[var(--fg)]">
                  {data.model}
                </div>
                <div className="text-xs text-[var(--fg-muted)]">
                  {t("models.provider")}: {data.provider || "—"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat
                label={t("models.contextEffective")}
                value={fmtCtx(data.effective_context_length)}
              />
              <Stat
                label={t("models.contextAuto")}
                value={fmtCtx(data.auto_context_length)}
              />
              <Stat
                label={t("models.contextOverride")}
                value={fmtCtx(data.config_context_length)}
              />
            </div>

            {caps.length > 0 ? (
              <div className="mt-5">
                <div className="mb-2 text-[11px] uppercase tracking-wide text-[var(--fg-subtle)]">
                  {t("models.capabilities")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {caps.map(([k]) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium text-[var(--fg)]"
                      style={{
                        borderColor: "var(--primary)",
                        background: "var(--primary-soft)",
                      }}
                    >
                      <Check className="h-3 w-3" style={{ color: "var(--primary)" }} />
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-[var(--fg-muted)]">{t("models.noModel")}</p>
        )}
      </CardBody>
    </Card>
  );
}

function AuxiliaryCard({ data }: { data: AuxiliaryResponse }) {
  const t = useT();
  return (
    <Card>
      <CardHeader title={t("models.auxiliary")} />
      <CardBody className="p-0">
        <div className="divide-y">
          {data.tasks.map((task) => (
            <div
              key={task.task}
              className="flex items-center justify-between px-5 py-3"
            >
              <span className="font-mono text-xs text-[var(--fg)]">
                {task.task}
              </span>
              <span className="text-xs text-[var(--fg-muted)]">
                {task.provider === "auto" || !task.model ? (
                  <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    {t("models.auxAuto")}
                  </span>
                ) : (
                  <span className="font-mono">
                    {task.model}{" "}
                    <span className="text-[var(--fg-subtle)]">
                      ({task.provider})
                    </span>
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function ModelPickerDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["model-options"],
    queryFn: api.modelOptions,
    enabled: open,
  });

  const setMut = useMutation({
    mutationFn: (v: { provider: string; model: string }) =>
      api.setModel({
        scope: "main",
        provider: v.provider,
        model: v.model,
        confirm_expensive_model: true,
      }),
    onSuccess: (res) => {
      if (res && (res as { ok?: boolean }).ok === false) {
        toast("error", t("models.applyFailed"));
        return;
      }
      toast("success", t("models.applied"));
      qc.invalidateQueries({ queryKey: ["model-info"] });
      qc.invalidateQueries({ queryKey: ["model-aux"] });
      onClose();
    },
    onError: (e) => toast("error", (e as Error).message),
  });

  const providers = useMemo(() => {
    const all = data?.providers ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return all.filter((p) => (p.models?.length ?? 0) > 0);
    return all
      .map((p) => ({
        ...p,
        models: (p.models ?? []).filter(
          (m) =>
            m.toLowerCase().includes(term) ||
            p.name.toLowerCase().includes(term) ||
            p.slug.toLowerCase().includes(term),
        ),
      }))
      .filter((p) => (p.models?.length ?? 0) > 0);
  }, [data, q]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("models.picker.title")}
      size="lg"
    >
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("models.picker.search")}
            className="w-full rounded-md border bg-white py-2 pl-9 pr-3 text-sm text-[var(--fg)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
          />
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} />
      ) : (
        <div className="space-y-4">
          {providers.map((p) => (
            <ProviderGroup
              key={p.slug}
              provider={p}
              busy={setMut.isPending}
              onPick={(model) => setMut.mutate({ provider: p.slug, model })}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}

function ProviderGroup({
  provider,
  onPick,
  busy,
}: {
  provider: ModelProviderOption;
  onPick: (model: string) => void;
  busy: boolean;
}) {
  const t = useT();
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--fg)]">
          {provider.name}
        </span>
        {provider.authenticated ? (
          <span
            className="inline-flex items-center gap-0.5 text-[10px]"
            style={{ color: "var(--success)" }}
          >
            <ShieldCheck className="h-3 w-3" />
            {t("models.picker.authenticated")}
          </span>
        ) : (
          <span className="text-[10px] text-[var(--fg-subtle)]">
            {t("models.picker.notConfigured")}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {(provider.models ?? []).map((m) => {
          const cap = provider.capabilities?.[m];
          return (
            <button
              key={m}
              disabled={busy}
              onClick={() => onPick(m)}
              className="group flex items-center justify-between rounded-md border bg-white px-3 py-2 text-left text-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                {provider.is_current ? (
                  <Check className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />
                ) : null}
                <span className="break-all font-mono text-xs text-[var(--fg)]">
                  {m}
                </span>
                {cap?.reasoning ? (
                  <span className="rounded bg-[var(--bg)] px-1 text-[9px] text-[var(--fg-muted)]">
                    {t("models.reasoning")}
                  </span>
                ) : null}
                {cap?.fast ? (
                  <span className="rounded bg-[var(--bg)] px-1 text-[9px] text-[var(--fg-muted)]">
                    {t("models.fast")}
                  </span>
                ) : null}
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--fg-subtle)] transition group-hover:text-[var(--primary)]" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
