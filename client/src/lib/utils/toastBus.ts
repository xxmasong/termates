export interface ToastRequest {
  id: string;
  title: string;
  message?: string;
  tone?: 'info' | 'success' | 'warning' | 'error';
}

type ToastListener = (toast: ToastRequest) => void;

const listeners = new Set<ToastListener>();

export const subscribeToasts = (listener: ToastListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const pushToast = (toast: ToastRequest): void => {
  listeners.forEach((listener) => listener(toast));
};
