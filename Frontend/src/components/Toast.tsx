import React from 'react';
import { useToastStore } from '../store/toastStore';

export const Toast: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-3 left-3 z-50 flex flex-col gap-1.5 max-w-sm pointer-events-none"
    >
      {toasts.map((toast) => {
        let borderClass = 'border-primary bg-primary text-white';
        if (toast.type === 'success') {
          borderClass = 'border-success bg-white text-success border';
        } else if (toast.type === 'error') {
          borderClass = 'border-accent bg-white text-accent border';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between px-3 py-2 text-xs font-medium shadow-none transition-all ${borderClass}`}
            role="status"
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-current opacity-70 hover:opacity-100 font-bold"
              aria-label="Dismiss toast"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};
