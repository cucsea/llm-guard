import { create } from "zustand";
import { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

type ToastKind = "success" | "error";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (kind: ToastKind, message: string) => void;
  remove: (id: number) => void;
}

let seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(kind: ToastKind, message: string) {
  useToastStore.getState().push(kind, message);
}

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    // no-op; auto-dismiss handled in store
  }, []);
  const isError = toast.kind === "error";
  return (
    <div
      className="flex items-start gap-2 rounded-[var(--radius)] border bg-[var(--panel)] px-4 py-3 shadow-lg"
      style={{ borderColor: isError ? "var(--danger)" : "var(--success)" }}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--danger)" }} />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--success)" }} />
      )}
      <span className="max-w-xs break-words text-xs text-[var(--fg)]">
        {toast.message}
      </span>
      <button
        onClick={onClose}
        className="ml-1 text-[var(--fg-subtle)] transition hover:text-[var(--fg)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
