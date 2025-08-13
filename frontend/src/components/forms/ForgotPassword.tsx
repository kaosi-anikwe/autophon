import { Link } from "react-router-dom";

export default function ForgotPassword() {
  return (
    <>
      <h5 className="text-xl font-bold mb-1">Forgot Password</h5>
      <p className="text-primary text-sm mb-1">
        Enter your email address, and we will email you a link to change your
        password.
      </p>
      <form className="grid grid-cols-12 gap-4">
        <div className="col-span-10 mb-1">
          <label htmlFor="email" className="floating-label">
            <span>Email address</span>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              className="w-full input validator"
            />

            <div className="validator-hint">
              <p>Invalid password</p>
            </div>
          </label>
        </div>
        <button type="submit" className="col-span-2 btn btn-primary" disabled>
          Submit
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
