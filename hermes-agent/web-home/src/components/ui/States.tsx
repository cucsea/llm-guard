import { Loader2, AlertTriangle, Inbox } from "lucide-react";
import { useT } from "@/i18n";

export function Spinner({ label }: { label?: string }) {
  const t = useT();
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--fg-muted)]">
      <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--primary)" }} />
      <span>{label ?? t("common.loading")}</span>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertTriangle className="h-6 w-6" style={{ color: "var(--danger)" }} />
      <p className="text-sm font-medium text-[var(--fg)]">{t("common.error")}</p>
      {message ? (
        <p className="max-w-md break-words text-xs text-[var(--fg-muted)]">
          {message}
        </p>
      ) : null}
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-1 rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--fg)] transition hover:bg-[var(--bg)]"
        >
          {t("common.retry")}
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ message }: { message?: string }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-[var(--fg-muted)]">
      <Inbox className="h-6 w-6 text-[var(--fg-subtle)]" />
      <p className="text-sm">{message ?? t("common.empty")}</p>
    </div>
  );
}
