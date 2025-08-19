import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/hooks/useAppDispatch";
import { resetPassword, clearResetPasswordState } from "@/store/authSlice";
import { useToast } from "@/contexts/ToastContext";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { resetPasswordLoading } = useAppSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  useEffect(() => {
    // Clear reset password state when component mounts
    dispatch(clearResetPasswordState());
  }, [dispatch]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await dispatch(resetPassword(data.email)).unwrap();
      // Success - show toast and clear form
      toast.success(
        "If an account with this email exists, a password reset link has been sent",
        "Reset Email Sent"
      );
      reset(); // Clear the form
    } catch (error) {
      // Error - show error toast (error message is in the rejected action payload)
      toast.error(
        typeof error === "string"
          ? error
          : "Password reset failed. Please try again.",
        "Reset Failed"
      );
    }
  };

  return (
    <>
      <h5 className="text-xl font-bold mb-1">Forgot Password</h5>
      <p className="text-primary text-sm mb-1">
        Enter your email address, and we will email you a link to change your
        password.
      </p>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-12 gap-4"
      >
        <div className="col-span-10 mb-1">
          <label htmlFor="email" className="floating-label">
            <span>Email address</span>
            <input
              {...register("email")}
              id="email"
              type="email"
              placeholder="Enter your email"
              className={`w-full input validator ${
                errors.email ? "input-error" : ""
              }`}
              disabled={resetPasswordLoading}
            />
            {errors.email && (
              <div className="validator-hint">
                <p>{errors.email.message}</p>
              </div>
            )}
          </label>
        </div>
        <button
          type="submit"
          className="col-span-2 btn btn-primary font-thin"
          disabled={resetPasswordLoading}
        >
          {resetPasswordLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Submit"
          )}
        </button>
      </form>
      <div className="grid grid-cols-12">
        <div className="text-left text-sm col-span-12">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </>
  );
}
