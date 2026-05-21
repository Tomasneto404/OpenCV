import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
}

interface ToastContextValue {
  push: (t: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const DURATION_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback<ToastContextValue['push']>((t) => {
    const id = nextId.current++;
    setToasts((curr) => [...curr, { ...t, id }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((curr) => curr.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="fixed top-3 right-3 z-50 flex flex-col gap-2 pointer-events-none w-[min(360px,calc(100vw-1.5rem))]"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, DURATION_MS);
    return () => window.clearTimeout(t);
  }, [onDismiss]);

  const tone =
    toast.kind === 'success' ? 'border-emerald-400/30 bg-emerald-500/10' :
    toast.kind === 'error'   ? 'border-red-400/30 bg-red-500/10' :
                                'border-white/15 bg-white/[0.06]';
  const dot =
    toast.kind === 'success' ? 'bg-emerald-400' :
    toast.kind === 'error'   ? 'bg-red-400' :
                                'bg-white/60';

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className={[
        'pointer-events-auto rounded-xl border backdrop-blur px-4 py-3 shadow-lg',
        'flex items-start gap-3 text-sm',
        tone,
      ].join(' ')}
    >
      <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dot}`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white">{toast.title}</p>
        {toast.body && <p className="mt-0.5 text-[12.5px] text-white/70 leading-relaxed">{toast.body}</p>}
      </div>
      <button
        onClick={onDismiss}
        className="text-white/40 hover:text-white text-base leading-none shrink-0 -mr-1 px-1"
        aria-label="Fechar notificação"
      >×</button>
    </div>
  );
}
