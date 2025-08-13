import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";

import { registerSchema, type RegisterFormData } from "../../lib/schemas";
import { useAppDispatch, useAppSelector } from "../../hooks/useAppDispatch";
import { register as registerUser, clearError } from "../../store/authSlice";
import UserGuides from "../features/UserGuides";
import Captcha from "../features/Captcha";

export default function RegisterForm() {
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error, isAuthenticated } = useAppSelector(
    (state) => state.auth
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
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

  const onSubmit = async (data: RegisterFormData) => {
    const { ...userData } = data;
    dispatch(registerUser(userData));
  };

  console.log(captchaVerified);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 my-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="floating-label">
          Email address
          <input
            id="email"
            type="email"
            placeholder="john@example.com"
            {...register("email")}
            className={
              errors.email ? "input border-accent w-full" : "input w-full"
            }
          />
          {errors.email && (
            <p className="text-accent text-sm">{errors.email.message}</p>
          )}
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirm-email" className="floating-label">
          Confirm email address
          <input
            id="confirm-email"
            type="email"
            placeholder="john@example.com"
            {...register("email")}
            className={
              errors.email ? "input border-accent w-full" : "input w-full"
            }
          />
          {errors.email && (
            <p className="text-accent text-sm">{errors.email.message}</p>
          )}
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor="title" className="floating-label">
          Title
          <input
            id="title"
            placeholder="Dr., Prof., etc."
            {...register("title")}
            className="input w-full"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="first_name" className="floating-label">
            First Name
            <input
              id="first_name"
              placeholder="John"
              {...register("first_name")}
              className={errors.first_name ? "input border-accent" : "input"}
            />
            {errors.first_name && (
              <p className="text-accent text-sm">{errors.first_name.message}</p>
            )}
          </label>
        </div>
        <div className="space-y-2">
          <label htmlFor="last_name" className="floating-label">
            Last Name
            <input
              id="last_name"
              placeholder="Doe"
              {...register("last_name")}
              className={errors.last_name ? "input border-accent" : "input"}
            />
            {errors.last_name && (
              <p className="text-accent text-sm">{errors.last_name.message}</p>
            )}
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="affiliation" className="floating-label">
          Affiliation
          <input
            id="affiliation"
            placeholder="University, Company, etc."
            {...register("org")}
            className="input w-full"
          />
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor="org" className="floating-label">
          Organization
          <input
            id="org"
            placeholder="University, Company, etc."
            {...register("org")}
            className="input w-full"
          />
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor="industry" className="floating-label">
          Industry
          <input
            id="industry"
            placeholder="Education, Research, etc."
            {...register("industry")}
            className="input w-full"
          />
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="floating-label">
          Password
          <input
            id="password"
            type="password"
            placeholder="Create a strong password"
            {...register("password")}
            className={
              errors.password ? "input border-accent w-full" : "input w-full"
            }
          />
          {errors.password && (
            <p className="text-accent text-sm">{errors.password.message}</p>
          )}
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword">
          Confirm Password
          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            {...register("confirmPassword")}
            className={
              errors.confirmPassword
                ? "input border-accent w-full"
                : "input w-full"
            }
          />
          {errors.confirmPassword && (
            <p className="text-accent text-sm">
              {errors.confirmPassword.message}
            </p>
          )}
        </label>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-1">
          <input type="checkbox" className="checkbox" />
        </div>
        <div className="col-span-11">
          <p className="text-base-300 text-sm leading-0">
            I agree to cite Autophon in any research outputs in accordance with
            the "How to cite" section in the below language-specific user
            guides:
          </p>
        </div>
      </div>

      <UserGuides>
        <h3 className="text-lg font-bold mb-0">User Guides</h3>
      </UserGuides>

      <button
        type="submit"
        className="btn btn-primary font-thin w-[20%]"
        disabled={isLoading}
      >
        {isLoading ? "Submitting..." : "Register"}
      </button>

      <div className="w-50 pt-2">
        <Captcha onVerify={setCaptchaVerified} />
      </div>

      <div className="text-left text-sm">
        Already have an account?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Login
        </Link>
      </div>
    </form>
  );
}
