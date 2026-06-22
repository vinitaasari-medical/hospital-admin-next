/**
 * Result/state messages — block-level success/error/warning displays.
 */
import * as React from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

function StateBlock({
  title,
  description,
  action,
  className,
  iconClass,
  Icon,
}: StateProps & { iconClass: string; Icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className={cn("flex flex-col items-center text-center py-10 px-6", className)}>
      <div className={cn("h-12 w-12 rounded-full flex items-center justify-center mb-3", iconClass)}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const SuccessState = (p: StateProps) => (
  <StateBlock {...p} Icon={CheckCircle2} iconClass="bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-fg))]" />
);
export const ErrorState = (p: StateProps) => (
  <StateBlock {...p} Icon={XCircle} iconClass="bg-[hsl(var(--status-error-bg))] text-[hsl(var(--status-error-fg))]" />
);
export const WarningState = (p: StateProps) => (
  <StateBlock {...p} Icon={AlertTriangle} iconClass="bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-fg))]" />
);
