import { createContext, useContext, useState, useCallback, useRef } from 'react';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastApi {
  toasts: Toast[];
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi>({
  toasts: [],
  success: () => {},
  error: () => {},
  info: () => {},
  dismiss: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((type: Toast['type'], message: string) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const success = useCallback((msg: string) => add('success', msg), [add]);
  const error = useCallback((msg: string) => add('error', msg), [add]);
  const info = useCallback((msg: string) => add('info', msg), [add]);

  return (
    <ToastContext.Provider value={{ toasts, success, error, info, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
