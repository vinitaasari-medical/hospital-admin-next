/**
 * <RowActions /> — compact dropdown of contextual actions.
 * Useful outside <DataTable /> (e.g. cards).
 */
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface RowActionsProps {
  actions: ActionItem[];
  align?: "start" | "end";
  trigger?: React.ReactNode;
}

export function RowActions({ actions, align = "end", trigger }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {actions.map((a) => (
          <DropdownMenuItem
            key={a.label}
            onClick={a.onClick}
            disabled={a.disabled}
            className={cn(a.destructive && "text-destructive focus:text-destructive")}
          >
            {a.icon && <a.icon className="h-4 w-4 mr-2" />}
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
