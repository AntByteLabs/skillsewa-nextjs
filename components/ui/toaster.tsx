"use client";
import * as React from "react";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4 shadow-lg animate-fade-in",
            "bg-white text-foreground",
            toast.variant === "destructive" && "border-red-200 bg-red-50",
            toast.variant === "success" && "border-green-200 bg-green-50"
          )}
        >
          {toast.variant === "success" && <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />}
          {toast.variant === "destructive" && <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />}
          {toast.variant === "warning" && <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />}
          {(!toast.variant || toast.variant === "default") && <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />}
          <div className="flex-1 min-w-0">
            {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
            {toast.description && <p className="text-sm text-muted-foreground mt-0.5">{toast.description}</p>}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
