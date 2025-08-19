import { z } from "zod";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Loader2, Shield, ArrowLeft } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/hooks/useAppDispatch";

import { login } from "@/store/authSlice";

const adminLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { isLoading, isAuthenticated, user, error } = useAppSelector(
    (state) => state.auth
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
  });

  // Redirect if already authenticated as admin
  useEffect(() => {
    if (isAuthenticated && user?.admin) {
      const from = (location.state as any)?.from?.pathname || "/admin";
      navigate(from, { replace: true });
    } else if (isAuthenticated && !user?.admin) {
      // If logged in as non-admin, redirect to home
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  const onSubmit = async (data: AdminLoginFormData) => {
    try {
      // Add admin flag to login request
      const loginData = {
        ...data,
        admin: true, // This tells the backend to only authenticate admin users
      };

      const user = await dispatch(login(loginData)).unwrap();

      if (!user.admin) {
        setError("root", {
          message: "Access denied. Admin privileges required.",
        });
        return;
      }

      // Successful admin login - redirect to intended page
      const from = (location.state as any)?.from?.pathname || "/admin";
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error("Admin login error:", error);
      // Error will be shown from the error state
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Back to site link */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm link link-neutral hover:link-primary"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Site
          </Link>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Administrator Login</h1>
              <p className="text-base-content/70 text-sm mt-2">
                Restricted access for administrators only
              </p>
            </div>

            {/* Error Messages */}
            {error && (
              <div className="alert alert-error mb-4">
                <span className="text-sm">{error}</span>
              </div>
            )}

            {errors.root && (
              <div className="alert alert-error mb-4">
                <span className="text-sm">{errors.root.message}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Field */}
              <div className="form-control">
                <label htmlFor="email" className="label">
                  <span className="label-text font-medium">Email</span>
                </label>
                <input
                  {...register("email")}
                  type="email"
                  id="email"
                  className={`input input-bordered w-full ${
                    errors.email ? "input-error" : ""
                  }`}
                  placeholder="admin@example.com"
                  disabled={isLoading}
                />
                {errors.email && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {errors.email.message}
                    </span>
                  </label>
                )}
              </div>

              {/* Password Field */}
              <div className="form-control">
                <label htmlFor="password" className="label">
                  <span className="label-text font-medium">Password</span>
                </label>
                <div className="relative">
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    id="password"
                    className={`input input-bordered w-full pr-10 ${
                      errors.password ? "input-error" : ""
                    }`}
                    placeholder="Enter your password"
                    disabled={isLoading}
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
                      {errors.password.message}
                    </span>
                  </label>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary font-thin w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Sign In as Administrator
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="text-center mt-6 pt-6 border-t border-base-200">
              <p className="text-xs text-base-content/50">
                This login is restricted to administrators only.
                <br />
                Unauthorized access attempts are monitored and logged.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
