import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/hooks/useAppDispatch";
import { deleteAccount } from "@/store/authSlice";
import { useToast } from "@/contexts/ToastContext";
import { motion, AnimatePresence } from "framer-motion";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
}: DeleteAccountModalProps) {
  const [deleteCode, setDeleteCode] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [isDeleteCodeValid, setIsDeleteCodeValid] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { deleteAccountLoading, deleteAccountError } = useAppSelector(
    (state) => state.auth
  );

  const targetWord = "DELETE";

  useEffect(() => {
    // Check if the entered code spells "DELETE"
    const enteredWord = deleteCode.join("");
    setIsDeleteCodeValid(enteredWord === targetWord);
  }, [deleteCode]);

  useEffect(() => {
    // Reset form when modal opens
    if (isOpen) {
      setDeleteCode(["", "", "", "", "", ""]);
      setIsDeleteCodeValid(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // Show error toast when error occurs
    if (deleteAccountError) {
      toast.error(deleteAccountError, "Deletion Failed");
    }
  }, [deleteAccountError, toast]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single character

    const newDeleteCode = [...deleteCode];
    newDeleteCode[index] = value.toUpperCase();
    setDeleteCode(newDeleteCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !deleteCode[index] && index > 0) {
      // Focus previous input on backspace if current input is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData
      .getData("text")
      .toUpperCase()
      .slice(0, 6);
    const newDeleteCode = [...deleteCode];

    for (let i = 0; i < Math.min(pastedText.length, 6); i++) {
      newDeleteCode[i] = pastedText[i];
    }

    setDeleteCode(newDeleteCode);

    // Focus the next empty input or the last input
    const nextEmptyIndex = newDeleteCode.findIndex(
      (char, idx) => idx < 6 && !char
    );
    const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : 5;
    inputRefs.current[focusIndex]?.focus();
  };

  const handleConfirmDeletion = async () => {
    // Browser confirmation dialog
    const confirmed = window.confirm(
      "Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted."
    );

    if (!confirmed) return;

    try {
      await dispatch(deleteAccount()).unwrap();
      toast.success(
        "Your account has been deleted successfully.",
        "Account Deleted"
      );

      // Close modal and redirect to home page
      onClose();
      navigate("/", { replace: true });
    } catch {
      // Error is already handled by the useEffect above
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-base-300/95 opacity-50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.3,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-error" />
                <h2 className="text-xl font-bold text-error">Delete Account</h2>
              </div>
              <motion.button
                onClick={onClose}
                className="btn btn-ghost btn-sm btn-circle"
                disabled={deleteAccountLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Warning Content */}
            <div className="mb-6">
              <div className="alert alert-error mb-4">
                <AlertTriangle className="w-5 h-5" />
                <div className="text-sm">
                  <div className="font-semibold mb-1">
                    This action is irreversible!
                  </div>
                  <div>
                    All your uploaded files and data will be permanently
                    deleted.
                  </div>
                </div>
              </div>

              <div className="text-sm text-base-content mb-4">
                <p className="mb-2">Once you delete your account:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>
                    All your uploaded audio files will be permanently deleted
                  </li>
                  <li>All alignment results and TextGrid files will be lost</li>
                  <li>Your task history will be erased</li>
                  <li>Any custom dictionaries will be removed</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium mb-2">
                  To confirm, please type{" "}
                  <span className="font-bold text-error">DELETE</span> below:
                </p>

                {/* OTP-style input */}
                <div className="flex gap-2 justify-center">
                  {deleteCode.map((char, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      value={char}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className="input input-bordered w-12 h-12 text-center text-lg font-bold"
                      maxLength={1}
                      disabled={deleteAccountLoading}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <motion.button
                onClick={onClose}
                className="btn btn-ghost font-thin flex-1"
                disabled={deleteAccountLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleConfirmDeletion}
                disabled={!isDeleteCodeValid || deleteAccountLoading}
                className="btn btn-error font-thin flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {deleteAccountLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Account"
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
