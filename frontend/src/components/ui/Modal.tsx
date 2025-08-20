import { X } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

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
  const [shouldBounce, setShouldBounce] = useState(false);

  const sizeClasses = {
    sm: "relative modal-box p-4 w-11/12 max-w-md bottom-20",
    md: "relative modal-box p-4 w-11/12 max-w-2xl bottom-20",
    lg: "relative modal-box p-4 w-11/12 max-w-4xl md:bottom-0 bottom-20",
    xl: "relative modal-box p-4 w-11/12 max-w-6xl md:bottom-0 bottom-20",
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (closeOnBackdropClick) {
        onClose();
      } else {
        // Trigger bounce animation when clicking backdrop but can't close
        setShouldBounce(true);
        setTimeout(() => setShouldBounce(false), 500);
      }
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
            animate={
              shouldBounce
                ? {
                    opacity: 1,
                    scale: [1, 1.05, 0.95, 1.02, 1],
                    x: 0,
                    y: 0,
                    transition: {
                      duration: 0.5,
                      ease: "easeInOut",
                    },
                  }
                : {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    transition: {
                      type: "spring",
                      stiffness: 700,
                      damping: 30,
                    },
                  }
            }
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center border-b border-base-200 pb-1 justify-between mb-4">
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
