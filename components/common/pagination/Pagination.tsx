/**
 * <Pagination /> — compact page navigator.
 * Renders previous/next, current page, total pages, and a tight numeric range.
 */
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Max numeric buttons rendered (default 5). */
  siblingCount?: number;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
  siblingCount = 5,
}: PaginationProps) {
  const pages = React.useMemo(() => {
    const half = Math.floor(siblingCount / 2);
    let start = Math.max(1, page - half);
    const end = Math.min(totalPages, start + siblingCount - 1);
    start = Math.max(1, end - siblingCount + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages, siblingCount]);

  if (totalPages <= 1) return null;

  return (
    <nav
      className={cn("flex items-center justify-between gap-2", className)}
      aria-label="Pagination"
    >
      <span className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p) => (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="sm"
            className="h-8 min-w-[32px] px-2"
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
