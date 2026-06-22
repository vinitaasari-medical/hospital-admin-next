/**
 * <AppModal /> — wrapper over shadcn Dialog.
 * Adds: sizes, controlled/uncontrolled, header/footer slots, loading footer state.
 */
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

const sizeMap: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  full: "max-w-[92vw]",
};

export interface AppModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Render-prop alternative to children. */
  render?: (close: () => void) => React.ReactNode;
}

export function AppModal({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  footer,
  size = "md",
  children,
  className,
  contentClassName,
  render,
}: AppModalProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };

  return (
    <Dialog open={currentOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={cn(sizeMap[size], contentClassName)}>
        {(title || description) && (
          <DialogHeader className={className}>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div className="py-2">{render ? render(() => setOpen(false)) : children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
