/**
 * <AppAlert /> — inline alert with tone variants.
 */
import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, XCircle } from "lucide-react";

const alertVariants = cva("", {
  variants: {
    tone: {
      info: "border-[hsl(var(--status-info-fg)/0.3)] bg-[hsl(var(--status-info-bg))] text-[hsl(var(--status-info-fg))] [&>svg]:text-[hsl(var(--status-info-fg))]",
      success: "border-[hsl(var(--status-success-fg)/0.3)] bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-fg))] [&>svg]:text-[hsl(var(--status-success-fg))]",
      warning: "border-[hsl(var(--status-warning-fg)/0.3)] bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-fg))] [&>svg]:text-[hsl(var(--status-warning-fg))]",
      error: "border-[hsl(var(--status-error-fg)/0.3)] bg-[hsl(var(--status-error-bg))] text-[hsl(var(--status-error-fg))] [&>svg]:text-[hsl(var(--status-error-fg))]",
    },
  },
  defaultVariants: { tone: "info" },
});

const iconMap = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
} as const;

export interface AppAlertProps extends VariantProps<typeof alertVariants> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}

export function AppAlert({ tone = "info", title, description, icon, action, className }: AppAlertProps) {
  const Icon = icon || iconMap[tone || "info"] || AlertCircle;
  return (
    <Alert className={cn(alertVariants({ tone }), className)}>
      <Icon className="h-4 w-4" />
      <div className="flex-1">
        {title && <AlertTitle>{title}</AlertTitle>}
        {description && <AlertDescription>{description}</AlertDescription>}
      </div>
      {action && <div className="ml-auto">{action}</div>}
    </Alert>
  );
}
