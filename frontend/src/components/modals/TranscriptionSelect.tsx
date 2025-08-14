import { Modal } from "../ui/Modal";
import type { ModalProps } from "../ui/Modal";

export default function TranscriptionSelect({
  isOpen,
  onClose,
  children,
  size,
  closeOnBackdropClick,
}: ModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdropClick={closeOnBackdropClick}
      showCloseButton={false}
      size={size}
    >
      {children}
    </Modal>
  );
}
