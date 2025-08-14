import { X } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  actions?: ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  closeOnBackdropClick = true,
  actions,
}: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "relative modal-box p-4 w-11/12 max-w-md bottom-20",
    md: "relative modal-box p-4 w-11/12 max-w-2xl bottom-20",
    lg: "relative modal-box p-4 w-11/12 max-w-4xl md:bottom-0 bottom-20",
    xl: "relative modal-box p-4 w-11/12 max-w-6xl md:bottom-0 bottom-20",
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  };

  return createPortal(
    <dialog className="modal modal-open" onClick={handleBackdropClick}>
      <div className={sizeClasses[size]}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between mb-4">
            {title && <h3 className="font-bold text-lg">{title}</h3>}
            {showCloseButton && (
              <button
                className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div>{children}</div>

        {/* Actions */}
        {actions && <div className="modal-action">{actions}</div>}
      </div>
    </dialog>,
    document.getElementById("modal")!
  );
}
