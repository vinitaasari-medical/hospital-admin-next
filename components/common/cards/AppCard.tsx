/**
 * <AppCard /> — composable card primitives + a stat variant.
 */
import * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface AppCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  bodyClassName?: string;
  /** Hide default padding. */
  flush?: boolean;
}

export function AppCard({
  title,
  description,
  header,
  footer,
  bodyClassName,
  flush,
  children,
  className,
  ...props
}: AppCardProps) {
  return (
    <Card className={cn("shadow-card", className)} {...props}>
      {(title || description || header) && (
        <CardHeader className={cn(flush && "p-4")}>
          {header || (
            <>
              {title && <CardTitle className="text-base">{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </>
          )}
        </CardHeader>
      )}
      {children !== undefined && (
        <CardContent className={cn(flush && "p-4 pt-0", bodyClassName)}>{children}</CardContent>
      )}
      {footer && <CardFooter className={cn(flush && "p-4 pt-0")}>{footer}</CardFooter>}
    </Card>
  );
}

export interface AppStatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: { label: string; tone?: "positive" | "negative" | "neutral" };
  className?: string;
}

export function AppStatCard({ label, value, icon: Icon, trend, className }: AppStatCardProps) {
  const trendTone =
    trend?.tone === "positive"
      ? "text-[hsl(var(--status-success-fg))]"
      : trend?.tone === "negative"
        ? "text-[hsl(var(--status-error-fg))]"
        : "text-muted-foreground";
  return (
    <div className={cn("rounded-xl bg-card p-4 shadow-card flex items-center gap-4", className)}>
      {Icon && (
        <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-secondary" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground truncate">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {trend && <p className={cn("text-xs mt-0.5", trendTone)}>{trend.label}</p>}
      </div>
    </div>
  );
}
