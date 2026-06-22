'use client';
/**
 * useConfirm — programmatic ConfirmationDialog.
 * Returns a `confirm(opts)` promise + the dialog node to mount.
 *
 * Usage:
 *   const { confirm, dialog } = useConfirm();
 *   if (await confirm({ title: "Delete?", destructive: true })) doDelete();
 *   return (<>{dialog}{...}</>);
 */
import * as React from "react";
import { ConfirmationDialog } from "@/components/common/dialog";

interface ConfirmOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function useConfirm() {
  const [state, setState] = React.useState<{
    open: boolean;
    opts: ConfirmOptions | null;
    resolve: ((v: boolean) => void) | null;
  }>({ open: false, opts: null, resolve: null });

  const confirm = React.useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setState({ open: true, opts, resolve });
      }),
    [],
  );

  const handleClose = (result: boolean) => {
    state.resolve?.(result);
    setState({ open: false, opts: null, resolve: null });
  };

  const dialog = state.opts && (
    <ConfirmationDialog
      open={state.open}
      onOpenChange={(o) => !o && handleClose(false)}
      title={state.opts.title}
      description={state.opts.description}
      confirmLabel={state.opts.confirmLabel}
      cancelLabel={state.opts.cancelLabel}
      destructive={state.opts.destructive}
      onConfirm={() => handleClose(true)}
    />
  );

  return { confirm, dialog };
}
