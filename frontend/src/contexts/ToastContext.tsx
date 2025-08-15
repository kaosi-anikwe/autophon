import { createContext, useContext, useState, type ReactNode } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto remove toast after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Convenience methods
  const success = (message: string, title?: string, duration?: number) => {
    addToast({ type: "success", message, title, duration });
  };

  const error = (message: string, title?: string, duration?: number) => {
    addToast({ type: "error", message, title, duration });
  };

  const warning = (message: string, title?: string, duration?: number) => {
    addToast({ type: "warning", message, title, duration });
  };

  const info = (message: string, title?: string, duration?: number) => {
    addToast({ type: "info", message, title, duration });
  };

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast toast-top toast-end z-[1000] pt-20">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: () => void;
}) {
  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return "alert-success";
      case "error":
        return "alert-error";
      case "warning":
        return "alert-warning";
      case "info":
        return "alert-info";
      default:
        return "alert-info";
    }
  };

  const getIcon = (type: ToastType) => {
    const iconProps = { className: "w-5 h-5" };
    switch (type) {
      case "success":
        return <CheckCircle {...iconProps} />;
      case "error":
        return <XCircle {...iconProps} />;
      case "warning":
        return <AlertTriangle {...iconProps} />;
      case "info":
        return <Info {...iconProps} />;
      default:
        return <Info {...iconProps} />;
    }
  };

  return (
    <div className={`alert ${getToastStyles(toast.type)} shadow-lg`}>
      {getIcon(toast.type)}
      <div className="flex-1">
        {toast.title && <div className="font-normal">{toast.title}</div>}
        <div className="text-sm">{toast.message}</div>
      </div>
      {toast.action && (
        <button className="btn btn-sm" onClick={toast.action.onClick}>
          {toast.action.label}
        </button>
      )}
      <button
        className={`btn btn-${toast.type} btn-sm btn-circle`}
        onClick={onRemove}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
