import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";

import { useToast } from "../../hooks/useToast";
import { login, clearError } from "../../store/authSlice";
import { loginSchema, type LoginFormData } from "../../lib/schemas";
import { useAppDispatch, useAppSelector } from "../../hooks/useAppDispatch";

interface LoginFormProps {
  onForgotPasswordClick?: () => void;
}

export default function LoginForm({ onForgotPasswordClick }: LoginFormProps) {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const [errorShown, setErrorShown] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    // Clear error when component mounts
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    // Show error toast when error occurs
    if (error && !errorShown) {
      toast.error(error, "Login Failed");
      setErrorShown(true);
    }
  }, [error, errorShown, toast]);

  const onSubmit = async (data: LoginFormData) => {
    dispatch(login(data));
  };

  return (
    <>
      <motion.h5
        className="text-xl font-bold mb-1"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        Account-holder sign in
      </motion.h5>
      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-12 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="md:col-span-5 col-span-12 mb-1">
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

        <div className="md:col-span-5 col-span-12 mb-1">
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

        <motion.button
          type="submit"
          className="md:col-span-2 col-span-3 btn btn-primary font-thin"
          disabled={isLoading}
          whileHover={!isLoading ? { scale: 1.05 } : {}}
          whileTap={!isLoading ? { scale: 0.95 } : {}}
        >
          {isLoading ? "..." : "Login"}
        </motion.button>
      </motion.form>
      <motion.div
        className="grid grid-cols-12 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <div className="text-left text-sm col-span-5">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-primary hover:underline transition-colors duration-200"
          >
            Sign up
          </Link>
        </div>
        <div className="text-left text-sm col-span-5">
          {onForgotPasswordClick ? (
            <motion.button
              type="button"
              onClick={onForgotPasswordClick}
              className="text-primary hover:underline transition-colors duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Forgot Password?
            </motion.button>
          ) : (
            <Link
              to="/forgot-password"
              className="text-primary hover:underline transition-colors duration-200"
            >
              Forgot Password?
            </Link>
          )}
        </div>
      </motion.div>
    </>
  );
}
