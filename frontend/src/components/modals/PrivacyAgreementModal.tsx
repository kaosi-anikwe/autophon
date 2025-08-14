import { useState, useRef, useEffect } from "react";
import { Shield, AlertCircle, X } from "lucide-react";

import { useToast } from "../../hooks/useToast";

interface PrivacyAgreementModalProps {
  isOpen: boolean;
  onAgree: () => void;
  onClose: () => void;
}

export function PrivacyAgreementModal({
  isOpen,
  onAgree,
  onClose,
}: PrivacyAgreementModalProps) {
  const [inputValues, setInputValues] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
  ]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const toast = useToast();

  const expectedLetters = ["A", "G", "R", "E", "E"];

  useEffect(() => {
    if (isOpen) {
      // Reset inputs when modal opens
      setInputValues(["", "", "", "", ""]);
      // Focus first input after a short delay
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow letters and convert to uppercase
    const sanitizedValue = value.replace(/[^a-zA-Z]/g, "").toUpperCase();

    if (sanitizedValue.length > 1) return; // Only allow single character

    const newValues = [...inputValues];
    newValues[index] = sanitizedValue;
    setInputValues(newValues);

    // Auto-focus next input if current input is filled and valid
    if (sanitizedValue && index < 4) {
      const expectedLetter = expectedLetters[index];
      if (sanitizedValue === expectedLetter) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !inputValues[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const enteredWord = inputValues.join("");
    const expectedWord = expectedLetters.join("");

    if (enteredWord === expectedWord) {
      toast.success("Privacy agreement accepted!", "Agreement Confirmed");
      console.log("about to submit form");
      onAgree();
    } else {
      toast.error("Please type A-G-R-E-E to proceed.", "Invalid Input");
      // Reset inputs and focus first one
      setInputValues(["", "", "", "", ""]);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      toast.error(
        "You must agree to the privacy terms before signing up.",
        "Agreement Required"
      );
      onClose();
    }
  };

  const isComplete = inputValues.every(
    (value, index) => value === expectedLetters[index]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-base-100 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative flex flex-col items-center p-6 border-b border-base-300">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 btn btn-ghost btn-circle btn-sm hover:bg-base-200"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-center">
            Personal Data Protection
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="max-w-none">
            <p className="text-base-content/90 text-center leading-[1.15]">
              Autophon is committed to ensuring protection of all personal
              information, which is why a minimum of information is collected at
              registration, all audio is deleted after alignment, and why all
              data is stored on a server within the European Union. We recognise
              our obligations to the GDPR, which means you can request the data
              we keep at any point in time. You may also delete your account, at
              which point all personal data is wiped from our server. If you
              register with Autophon, it means you understand and agree.
            </p>
          </div>

          {/* Agreement Input Section */}
          <div className="bg-base-200/50 rounded-lg p-4 border-2 border-dashed border-primary/30">
            <div className="flex items-center justify-center align-middle gap-2 mb-4 mx-auto">
              <AlertCircle className="w-5 h-5 text-warning" />
              <p className="text-sm font-medium">
                Please type{" "}
                <span className="font-bold text-primary">A-G-R-E-E</span> to
                proceed:
              </p>
            </div>

            {/* OTP-style input */}
            <div className="flex justify-center gap-3 mb-4">
              {expectedLetters.map((letter, index) => (
                <div key={index} className="flex flex-col items-center">
                  <input
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    value={inputValues[index]}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`w-12 h-12 text-center text-xl font-bold border-2 rounded-lg 
                      ${
                        inputValues[index] === letter
                          ? "border-success/50 bg-success/10 text-success"
                          : inputValues[index]
                          ? "border-error/50 bg-error/10 text-error"
                          : "border-base-200 bg-base-100"
                      } 
                      focus:outline-none focus:ring-2 focus:ring-primary/50`}
                    maxLength={1}
                  />
                  <span className="text-xs text-base-content/60 mt-1 font-medium">
                    {letter}
                  </span>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSubmit}
                disabled={!isComplete}
                className={`btn font-thin px-8 ${
                  isComplete ? "btn-success" : "btn-disabled"
                }`}
              >
                I Agree & Submit Registration
              </button>
            </div>
          </div>

          {/* Help text */}
          <p className="text-xs text-base-content/60 text-center">
            Type each letter in the boxes above. Your registration will be
            submitted automatically after you agree.
          </p>
        </div>
      </div>
    </div>
  );
}
