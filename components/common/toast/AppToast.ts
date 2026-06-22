/**
 * Toast helpers.
 * Internally uses sonner — exposed as a stable API so consumers
 * don't depend on the underlying lib.
 */
import { toast } from "sonner";

export interface AppToastOptions {
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export const appToast = {
  default: (title: string, opts?: AppToastOptions) => toast(title, opts),
  success: (title: string, opts?: AppToastOptions) => toast.success(title, opts),
  error: (title: string, opts?: AppToastOptions) => toast.error(title, opts),
  warning: (title: string, opts?: AppToastOptions) => toast.warning(title, opts),
  info: (title: string, opts?: AppToastOptions) => toast.info(title, opts),
  loading: (title: string) => toast.loading(title),
  dismiss: (id?: string | number) => toast.dismiss(id),
};
