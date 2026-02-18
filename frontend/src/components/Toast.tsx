import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useToast } from '../lib/ToastContext';

const icons = {
  success: <CheckCircle className="w-4 h-4 text-green-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
  info: <Info className="w-4 h-4 text-blue-400" />,
};

const borders = {
  success: 'border-green-500/30',
  error: 'border-red-500/30',
  info: 'border-blue-500/30',
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-2.5 bg-chispa-card border ${borders[toast.type]} rounded-lg px-3 py-2.5 shadow-lg animate-slideUp`}
        >
          {icons[toast.type]}
          <span className="text-[12px] text-chispa-text-primary flex-1">{toast.message}</span>
          <button onClick={() => dismiss(toast.id)} className="text-chispa-text-muted hover:text-chispa-text-primary">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
