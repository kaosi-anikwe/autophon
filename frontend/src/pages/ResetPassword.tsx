import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { passwordResetAPI } from "@/lib/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [formState, setFormState] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [resetState, setResetState] = useState<{
    status: "form" | "loading" | "success" | "error";
    message: string;
  }>({
    status: "form",
    message: "",
  });

  const token = searchParams.get("token");

  // Check for token on mount
  useEffect(() => {
    if (!token) {
      setResetState({
        status: "error",
        message: "No reset token found in the URL.",
      });
    }
  }, [token]);

  // Password validation
  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return "Password is required";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/(?=.*\d)/.test(password)) {
      return "Password must contain at least one number";
    }
    return undefined;
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    const passwordError = validatePassword(formState.password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    if (!formState.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formState.password !== formState.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes with real-time validation
  const handleInputChange = (
    field: "password" | "confirmPassword",
    value: string
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));

    // Clear previous errors for this field
    setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));

    // Real-time validation
    if (field === "password" && value) {
      const passwordError = validatePassword(value);
      if (passwordError) {
        setErrors((prev) => ({ ...prev, password: passwordError }));
      }
    }

    if (field === "confirmPassword" && value && formState.password) {
      if (value !== formState.password) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords do not match",
        }));
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    if (!validateForm()) return;

    setResetState({ status: "loading", message: "" });

    try {
      const response = await passwordResetAPI.resetPasswordConfirm(
        formState.password,
        token
      );

      if (response.success) {
        setResetState({
          status: "success",
          message: response.message || "Password reset successfully!",
        });
      } else {
        setResetState({
          status: "error",
          message: response.message || "Password reset failed.",
        });
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "An error occurred during password reset.";
      setResetState({
        status: "error",
        message: errorMessage,
      });
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="text-2xl font-bold mb-6 text-center">
              Reset Password
            </h1>

            {/* Status Banner */}
            {resetState.status === "loading" && (
              <div className="alert alert-info mb-6">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Resetting your password...</span>
              </div>
            )}

            {resetState.status === "success" && (
              <div className="alert alert-success mb-6">
                <CheckCircle className="w-5 h-5" />
                <span>{resetState.message}</span>
              </div>
            )}

            {resetState.status === "error" && !token && (
              <div className="alert alert-error mb-6">
                <XCircle className="w-5 h-5" />
                <span>{resetState.message}</span>
              </div>
            )}

            {/* Content based on status */}
            {resetState.status === "success" && (
              <div className="space-y-4">
                <p className="text-base-content/70">
                  Your password has been successfully reset. You can now log in
                  with your new password.
                </p>
                <Link to="/login" className="btn btn-primary w-full font-thin">
                  Go to Login
                </Link>
              </div>
            )}

            {resetState.status === "error" && !token && (
              <div className="space-y-4">
                <p className="text-base-content/70">
                  Unable to reset your password. Please try requesting a new
                  reset link or contact support if the problem persists.
                </p>
                <div className="flex gap-2 justify-center">
                  <Link to="/login" className="btn btn-ghost bg-base-200">
                    Back to Login
                  </Link>
                  <Link to="/" className="btn btn-primary">
                    Go to Homepage
                  </Link>
                </div>
              </div>
            )}

            {(resetState.status === "form" ||
              (resetState.status === "error" && token)) &&
              token && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {resetState.status === "error" && (
                    <div className="alert alert-error mb-4">
                      <XCircle className="w-5 h-5" />
                      <span>{resetState.message}</span>
                    </div>
                  )}

                  {/* Password Field */}
                  <div className="form-control">
                    <label htmlFor="password" className="label">
                      <span className="label-text">New Password</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        className={`input input-bordered w-full pr-10 ${
                          errors.password ? "input-error" : ""
                        }`}
                        value={formState.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
                        placeholder="Enter your new password"
                        disabled={resetState.status === "loading"}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-base-content/50" />
                        ) : (
                          <Eye className="w-4 h-4 text-base-content/50" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <label className="label">
                        <span className="label-text-alt text-error">
                          {errors.password}
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div className="form-control">
                    <label htmlFor="confirmPassword" className="label">
                      <span className="label-text">Confirm New Password</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        className={`input input-bordered w-full pr-10 ${
                          errors.confirmPassword ? "input-error" : ""
                        }`}
                        value={formState.confirmPassword}
                        onChange={(e) =>
                          handleInputChange("confirmPassword", e.target.value)
                        }
                        placeholder="Confirm your new password"
                        disabled={resetState.status === "loading"}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4 text-base-content/50" />
                        ) : (
                          <Eye className="w-4 h-4 text-base-content/50" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <label className="label">
                        <span className="label-text-alt text-error">
                          {errors.confirmPassword}
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Password Requirements */}
                  <div className="text-xs text-base-content/60 space-y-1">
                    <p>Password must contain:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>At least 8 characters</li>
                      <li>One uppercase letter</li>
                      <li>One lowercase letter</li>
                      <li>One number</li>
                    </ul>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn btn-primary font-thin w-full"
                    disabled={
                      resetState.status === "loading" ||
                      !formState.password ||
                      !formState.confirmPassword ||
                      Object.keys(errors).some(
                        (key) => errors[key as keyof typeof errors]
                      )
                    }
                  >
                    {resetState.status === "loading" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Resetting Password...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </button>
                </form>
              )}

            {resetState.status === "form" && !token && (
              <div className="space-y-4">
                <p className="text-base-content/70">
                  Please wait while we validate your reset token.
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
