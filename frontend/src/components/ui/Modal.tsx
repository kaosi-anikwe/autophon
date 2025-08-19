import { X } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

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
    <AnimatePresence>
      {isOpen && (
        <motion.dialog 
          className="modal modal-open" 
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div 
            className={sizeClasses[size]}
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.3
            }}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between mb-4">
                {title && <h3 className="font-bold text-lg">{title}</h3>}
                {showCloseButton && (
                  <motion.button
                    className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                    onClick={onClose}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            )}

            {/* Content */}
            <div>{children}</div>

            {/* Actions */}
            {actions && <div className="modal-action">{actions}</div>}
          </motion.div>
        </motion.dialog>
      )}
    </AnimatePresence>,
    document.getElementById("modal")!
  );
}
