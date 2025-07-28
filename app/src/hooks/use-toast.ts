import { useState, useCallback, useEffect } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

const toastState: ToastState = {
  toasts: [],
};

let listeners: Array<(state: ToastState) => void> = [];

function dispatch(action: { type: string; toast?: Toast; id?: string }) {
  switch (action.type) {
    case 'ADD_TOAST':
      if (action.toast) {
        toastState.toasts.push(action.toast);
      }
      break;
    case 'REMOVE_TOAST':
      if (action.id) {
        toastState.toasts = toastState.toasts.filter(t => t.id !== action.id);
      }
      break;
    case 'CLEAR_TOASTS':
      toastState.toasts = [];
      break;
  }
  
  listeners.forEach(listener => listener(toastState));
}

export function useToast() {
  const [state, setState] = useState<ToastState>(toastState);

  // Subscribe to state changes
  const subscribe = useCallback((listener: (state: ToastState) => void) => {
    listeners.push(listener);
    listener(toastState); // Call immediately with current state
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  // Subscribe to updates on mount
  useEffect(() => {
    const unsubscribe = subscribe(setState);
    return unsubscribe;
  }, [subscribe]);

  const toast = useCallback(({ title, description, variant = 'default', duration = 5000 }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    const toastItem: Toast = {
      id,
      title,
      description,
      variant,
      duration,
    };

    dispatch({ type: 'ADD_TOAST', toast: toastItem });

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_TOAST', id });
      }, duration);
    }

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', id });
  }, []);

  return {
    toast,
    dismiss,
    toasts: state.toasts,
  };
}