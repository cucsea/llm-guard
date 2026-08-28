import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--fg)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-[var(--fg-muted)]">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
