/**
 * <Search /> — controlled search input with leading icon.
 */
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  clearable?: boolean;
}

export function Search({
  value,
  onChange,
  placeholder = "Search...",
  className,
  autoFocus,
  clearable = true,
}: SearchProps) {
  return (
    <div className={cn("relative flex-1", className)}>
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="pl-9 pr-9"
      />
      {clearable && value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
