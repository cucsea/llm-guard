import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: "text-white",
  secondary: "border text-[var(--fg)] hover:bg-[var(--bg)]",
  danger: "border text-[var(--danger)] hover:bg-red-50",
  ghost: "text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]",
};

export function Button({
  variant = "secondary",
  loading,
  children,
  className,
  disabled,
  style,
  ...rest
}: Props) {
  const primaryStyle =
    variant === "primary" ? { background: "var(--primary)", ...style } : style;
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={primaryStyle}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {children}
    </button>
  );
}
