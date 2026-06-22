/**
 * <Loader /> — spinner & skeleton list helpers.
 */
import * as React from "react";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface LoaderProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const sizeMap = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };

export function Loader({ size = "md", label, className }: LoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-6", className)}>
      <Loader2 className={cn(sizeMap[size], "animate-spin text-muted-foreground")} />
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}

export interface SkeletonListProps {
  rows?: number;
  className?: string;
}

export function SkeletonList({ rows = 4, className }: SkeletonListProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}
