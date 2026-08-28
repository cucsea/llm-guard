import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border bg-[var(--panel)] shadow-[var(--shadow-card)]",
        className,
      )}
      style={{ borderColor: "var(--border)" }}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  desc,
  action,
}: {
  title: ReactNode;
  desc?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-[var(--fg)]">
          {title}
        </h3>
        {desc ? (
          <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{desc}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}
