import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader2 } from "lucide-react";

import { captchaAPI } from "../../lib/api";
import { useToast } from "../../hooks/useToast";

type CaptchaProps = {
  onVerify: (verified: boolean, sessionId?: string) => void;
  isVisible: boolean;
};

export default function Captcha({ onVerify, isVisible }: CaptchaProps) {
  const [captchaImage, setCaptchaImage] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const toast = useToast();

  const fetchCaptcha = useCallback(async () => {
    setIsLoading(true);
    setUserInput("");
    try {
      const response = await captchaAPI.getCaptcha();
      setCaptchaImage(response.image);
    } catch (error) {
      console.error("Failed to fetch captcha:", error);
      toast.error("Failed to load captcha. Please try again.", "Captcha Error");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch captcha when component becomes visible
  useEffect(() => {
    if (isVisible && !captchaImage) {
      fetchCaptcha();
    }
  }, [isVisible, captchaImage, fetchCaptcha]);

  const handleVerify = async () => {
    if (!userInput.trim()) {
      toast.warning("Please enter the captcha code.", "Input Required");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await captchaAPI.verifyCaptcha({
        text: userInput.trim(),
      });

      if (response.success) {
        console.log("Captcha verification successful:", response);
        toast.success("Captcha verified successfully!", "Verification Success");
        onVerify(true);
      } else {
        toast.error(
          response.message || "Invalid captcha code. Please try again.",
          "Verification Failed"
        );
        onVerify(false);
        // Auto-refresh captcha on failed verification
        // fetchCaptcha();
      }
    } catch (error) {
      console.error("Captcha verification failed:", error);
      toast.error(
        "Verification failed. Please try again.",
        "Verification Error"
      );
      onVerify(false);
      // Auto-refresh captcha on error
      // fetchCaptcha();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRefresh = () => {
    fetchCaptcha();
  };

  if (!isVisible) return null;

  return (
    <div className="space-y-4 w-50 bg-base-50">
      {/* Captcha Image */}
      <div className="relative">
        {isLoading ? (
          <div className="w-full h-24 bg-base-200 rounded-lg animate-pulse flex items-center justify-center">
            <div className="skeleton w-32 h-8"></div>
          </div>
        ) : (
          <div className="flex justify-around relative w-50">
            <img
              src={`data:image/png;base64,${captchaImage}`}
              alt="CAPTCHA verification image"
              className="max-w-full h-auto"
            />
            {isLoading && (
              <div className="absolute inset-0 bg-base-200/50 rounded-lg flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input and Controls */}
      <div className="space-y-3">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={(e) =>
            e.key === "Enter" && !isVerifying && handleVerify()
          }
          placeholder="Enter the code shown above"
          className="input w-full"
          disabled={isLoading || isVerifying}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleVerify}
            disabled={isLoading || isVerifying || !userInput.trim()}
            className="btn font-thin flex-1"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading || isVerifying}
            className="btn btn-primary btn-square"
            title="Refresh captcha"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      <p className="text-xs text-base-content/60">
        Please enter the characters shown in the image above to verify you're
        human.
      </p>
    </div>
  );
}
