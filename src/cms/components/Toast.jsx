import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (message, type) => {
      const id = ++seq.current;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3800);
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({ success: (m) => push(m, 'success'), error: (m) => push(m, 'error'), info: (m) => push(m, 'info') }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="cms-toasts" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`cms-toast cms-toast--${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            <span>{t.message}</span>
            <button className="cms-toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};
