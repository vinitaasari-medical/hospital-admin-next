/**
 * <StatusBadge /> — soft tinted pill: bg + colored border + dot + colored text.
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        success: "",
        warning: "",
        info: "",
        error: "",
        neutral: "",
      },
      dot: { true: "", false: "" },
    },
    defaultVariants: { tone: "neutral", dot: true },
  },
);

const toneStyles: Record<NonNullable<VariantProps<typeof statusVariants>["tone"]>, React.CSSProperties> = {
  success: {
    backgroundColor: "hsl(var(--status-success-bg))",
    color: "hsl(var(--status-success-fg))",
    borderColor: "hsl(var(--status-success-fg) / 0.3)",
  },
  warning: {
    backgroundColor: "hsl(var(--status-warning-bg))",
    color: "hsl(var(--status-warning-fg))",
    borderColor: "hsl(var(--status-warning-fg) / 0.3)",
  },
  info: {
    backgroundColor: "hsl(var(--status-info-bg))",
    color: "hsl(var(--status-info-fg))",
    borderColor: "hsl(var(--status-info-fg) / 0.3)",
  },
  error: {
    backgroundColor: "hsl(var(--status-error-bg))",
    color: "hsl(var(--status-error-fg))",
    borderColor: "hsl(var(--status-error-fg) / 0.3)",
  },
  neutral: {
    backgroundColor: "hsl(var(--status-neutral-bg))",
    color: "hsl(var(--status-neutral-fg))",
    borderColor: "hsl(var(--status-neutral-fg) / 0.3)",
  },
};

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusVariants> {
  children: React.ReactNode;
}

export function StatusBadge({ tone = "neutral", dot = true, className, children, style, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(statusVariants({ tone, dot }), className)}
      style={{ ...toneStyles[tone], ...style }}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function getStatusTone(label: string): "success" | "warning" | "error" | "neutral" {
  const v = label.trim().toLowerCase();
  if (["active", "online", "approved", "completed", "success", "enabled", "in office"].includes(v)) return "success";
  if (["pending", "in progress", "in-progress", "waiting", "processing", "remote"].includes(v)) return "warning";
  if (["suspended", "inactive", "rejected", "failed", "error", "blocked", "disabled", "offline", "on leave"].includes(v)) return "error";
  return "neutral";
}
