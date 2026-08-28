import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const width = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-[var(--radius)] border bg-[var(--panel)] shadow-2xl",
          width,
        )}
      >
        {title ? (
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="text-sm font-semibold text-[var(--fg)]">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-[var(--fg-muted)] transition hover:bg-[var(--bg)] hover:text-[var(--fg)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l bg-[var(--panel)] shadow-2xl">
        {title ? (
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="text-sm font-semibold text-[var(--fg)]">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-[var(--fg-muted)] transition hover:bg-[var(--bg)] hover:text-[var(--fg)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
