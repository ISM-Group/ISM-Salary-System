import { ReactNode, createContext, createElement, useCallback, useContext, useMemo, useState } from 'react';

type ToastVariant = 'default' | 'destructive';

type ToastInput = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastItem = ToastInput & {
  id: string;
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = crypto.randomUUID();
      const nextToast = { id, variant: 'default' as ToastVariant, ...input };
      setToasts((current) => [nextToast, ...current].slice(0, 4));
      window.setTimeout(() => dismiss(id), input.variant === 'destructive' ? 6500 : 4000);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return createElement(
    ToastContext.Provider,
    { value },
    children,
    createElement(
      'div',
      {
        className: 'fixed right-4 top-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3',
        role: 'status',
        'aria-live': 'polite',
      },
      toasts.map((item) =>
        createElement(
          'button',
          {
            key: item.id,
            type: 'button',
            onClick: () => dismiss(item.id),
            className:
              item.variant === 'destructive'
                ? 'rounded-md border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-900 shadow-lg'
                : 'rounded-md border border-emerald-200 bg-white px-4 py-3 text-left text-sm text-slate-900 shadow-lg',
          },
          item.title &&
            createElement(
              'div',
              {
                className: 'font-semibold',
              },
              item.title
            ),
          item.description &&
            createElement(
              'div',
              {
                className: item.title ? 'mt-1 text-xs opacity-85' : 'text-xs opacity-85',
              },
              item.description
            )
        )
      )
    )
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: (_input: ToastInput) => {
        return;
      },
    };
  }
  return context;
}
