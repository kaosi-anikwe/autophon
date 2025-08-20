import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { emailVerificationAPI } from "@/lib/api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [verificationState, setVerificationState] = useState<{
    status: "loading" | "success" | "error";
    message: string;
  }>({
    status: "loading",
    message: "",
  });

  const token = searchParams.get("token");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setVerificationState({
          status: "error",
          message: "No verification token found in the URL.",
        });
        return;
      }

      try {
        const response = await emailVerificationAPI.verifyEmail(token);

        if (response.success) {
          setVerificationState({
            status: "success",
            message: response.message || "Email verified successfully!",
          });
        } else {
          setVerificationState({
            status: "error",
            message: response.message || "Email verification failed.",
          });
        }
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message ||
          "An error occurred during email verification.";
        setVerificationState({
          status: "error",
          message: errorMessage,
        });
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h1 className="text-2xl font-bold mb-6">Email Verification</h1>

            {/* Status Banner */}
            {verificationState.status === "loading" && (
              <div className="alert alert-info mb-6">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying your email address...</span>
              </div>
            )}

            {verificationState.status === "success" && (
              <div className="alert alert-success mb-6">
                <CheckCircle className="w-5 h-5" />
                <span>{verificationState.message}</span>
              </div>
            )}

            {verificationState.status === "error" && (
              <div className="alert alert-error mb-6">
                <XCircle className="w-5 h-5" />
                <span>{verificationState.message}</span>
              </div>
            )}

            {/* Content based on status */}
            {verificationState.status === "success" && (
              <div className="space-y-4">
                <p className="text-base-content/70">
                  Your email has been successfully verified. You can now log in
                  to your account.
                </p>
                <Link to="/login" className="btn btn-primary font-thin w-full">
                  Go to Login
                </Link>
              </div>
            )}

            {verificationState.status === "error" && (
              <div className="space-y-4">
                <p className="text-base-content/70">
                  Unable to verify your email address. Please try again or
                  contact support if the problem persists.
                </p>
                <div className="flex gap-2 justify-center">
                  <Link
                    to="/register"
                    className="btn btn-ghost font-thin bg-base-200"
                  >
                    Register Again
                  </Link>
                  <Link to="/login" className="btn btn-primary font-thin">
                    Go to Login
                  </Link>
                </div>
              </div>
            )}

            {verificationState.status === "loading" && (
              <div className="space-y-4">
                <p className="text-base-content/70">
                  Please wait while we verify your email address.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link to="/" className="link link-primary text-sm">
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
