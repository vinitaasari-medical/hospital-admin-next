/**
 * <FilterBar /> — single "Filter" trigger that opens a popover
 * with all available filters grouped inside. Shows an active count badge
 * and supports clear/apply.
 */
import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDef {
  key: string;
  label: string;
  /** "all" value is added automatically. */
  options: FilterOption[];
  width?: number | string;
}

export interface FilterBarProps {
  filters: FilterDef[];
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  className?: string;
  allLabel?: string;
  triggerLabel?: string;
}

export function FilterBar({
  filters,
  value,
  onChange,
  className,
  allLabel = "All",
  triggerLabel = "Filters",
}: FilterBarProps) {
  const [open, setOpen] = React.useState(false);

  const activeCount = filters.reduce(
    (n, f) => n + (value[f.key] && value[f.key] !== "all" ? 1 : 0),
    0,
  );

  const reset = () => {
    const cleared: Record<string, string> = {};
    filters.forEach((f) => (cleared[f.key] = "all"));
    onChange(cleared);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            {triggerLabel}
            {activeCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px]"
              >
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-[320px] p-0"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">Filters</p>
              <p className="text-xs text-muted-foreground">
                Refine the list below.
              </p>
            </div>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="h-7 gap-1 text-xs text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Clear all
              </Button>
            )}
          </div>

          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {filters.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  {f.label}
                </Label>
                <Select
                  value={value[f.key] || "all"}
                  onValueChange={(v) => onChange({ ...value, [f.key]: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{allLabel}</SelectItem>
                    {f.options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
