"use client";
import { useState, useCallback } from "react";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "warning";
  duration?: number;
}

let listeners: Array<(toasts: Toast[]) => void> = [];
let toastState: Toast[] = [];

function notify() {
  listeners.forEach((l) => l([...toastState]));
}

export function toast(t: Omit<Toast, "id">) {
  const id = Math.random().toString(36).slice(2);
  const duration = t.duration ?? 4000;
  toastState = [...toastState, { ...t, id }];
  notify();
  setTimeout(() => {
    toastState = toastState.filter((x) => x.id !== id);
    notify();
  }, duration);
  return id;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastState);

  const subscribe = useCallback(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  // Subscribe on mount
  if (typeof window !== "undefined" && !listeners.includes(setToasts)) {
    listeners.push(setToasts);
  }

  const dismiss = useCallback((id: string) => {
    toastState = toastState.filter((t) => t.id !== id);
    notify();
  }, []);

  return { toasts, dismiss, subscribe };
}
