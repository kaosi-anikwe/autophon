import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";

import { login, clearError } from "../../store/authSlice";
import { loginSchema, type LoginFormData } from "../../lib/schemas";
import { useAppDispatch, useAppSelector } from "../../hooks/useAppDispatch";

export default function LoginForm() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error, isAuthenticated } = useAppSelector(
    (state) => state.auth
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Clear error when component mounts
    dispatch(clearError());
  }, [dispatch]);

  const onSubmit = async (data: LoginFormData) => {
    dispatch(login(data));
  };

  if (error) {
    console.log(error);
  }

  return (
    <>
      <h5 className="text-xl font-bold mb-1">Account-holder sign in</h5>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-12 gap-4"
      >
        <div className="col-span-5 mb-1">
          <label htmlFor="email" className="floating-label">
            <span>Email address</span>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...register("email")}
              className="input validator"
            />
            {errors.email && (
              <div className="validator-hint">
                <p>{errors.email.message}</p>
              </div>
            )}
          </label>
        </div>

        <div className="col-span-5 mb-1">
          <label htmlFor="password" className="floating-label">
            <span>Password</span>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              {...register("password")}
              className="input validator"
            />
          </label>
          {errors.password && (
            <div className="validator-hint">
              <p>{errors.password.message}</p>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="col-span-2 btn btn-primary font-thin"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
      <div className="grid grid-cols-12 gap-4">
        <div className="text-left text-sm col-span-5">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
        <div className="text-left text-sm col-span-5">
          <Link to="/register" className="text-primary hover:underline">
            Forgot Password?
          </Link>
        </div>
      </div>
    </>
  );
}
