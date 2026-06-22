/**
 * <AppSidePanel /> — side panel built on shadcn Sheet. Supports left/right/top/bottom sides.
 */
import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type SidePanelSide = "left" | "right" | "top" | "bottom";
export type SidePanelSize = "sm" | "md" | "lg" | "xl";

const widthMap: Record<SidePanelSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
};

export interface AppSidePanelProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  side?: SidePanelSide;
  size?: SidePanelSize;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  contentClassName?: string;
}

export function AppSidePanel({
  open,
  onOpenChange,
  trigger,
  side = "right",
  size = "md",
  title,
  description,
  footer,
  children,
  contentClassName,
}: AppSidePanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent
        side={side}
        className={cn("w-[88vw]", widthMap[size], "flex flex-col p-0", contentClassName)}
      >
        {(title || description) && (
          <SheetHeader className="px-6 py-4 border-b border-border">
            {title && <SheetTitle>{title}</SheetTitle>}
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
        )}
        <div className="flex-1 overflow-auto px-6 py-4">{children}</div>
        {footer && (
          <SheetFooter className="px-6 py-4 border-t border-border">{footer}</SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
