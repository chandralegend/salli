import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

type Toast = { id: number; message: string; variant: ToastVariant; duration: number };

type ToastStore = {
  toast: Toast | null;
  show: (message: string, variant?: ToastVariant, opts?: { duration?: number }) => void;
  hide: () => void;
};

const DEFAULT_DURATION: Record<ToastVariant, number> = { success: 2600, info: 2600, error: 3400 };

let nextId = 0;

/** Internal store — ToastHost reads `toast`/`hide` from this directly. */
export const useToastStore = create<ToastStore>((set) => ({
  toast: null,
  show: (message, variant = "info", opts) =>
    set({ toast: { id: ++nextId, message, variant, duration: opts?.duration ?? DEFAULT_DURATION[variant] } }),
  hide: () => set({ toast: null }),
}));

/** Public API for call sites — just the `show` function, selected so callers
 * don't re-render when the toast's own visible/hidden state changes. */
export function useToast() {
  return useToastStore((s) => s.show);
}
