import { useAppDispatch, useAppSelector } from "../../hooks/useAppDispatch";
import { useToast } from "../../hooks/useToast";
import { login, register, logout, verifyToken } from "../../store/authSlice";

export function AuthTest() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isLoading, isAuthenticated, user, error } = useAppSelector(
    (state) => state.auth
  );

  const testLogin = () => {
    dispatch(login({
      email: "testuser@example.com",
      password: "testpassword123"
    }));
  };

  const testRegister = () => {
    dispatch(register({
      email: "newuser@example.com",
      password: "newpassword123",
      first_name: "Test",
      last_name: "User",
      title: "Dr.",
      org: "Test Organization",
      industry: "Education"
    }));
  };

  const testLogout = () => {
    dispatch(logout());
  };

  const testVerify = () => {
    dispatch(verifyToken());
  };

  const testToasts = () => {
    toast.success("Authentication successful!", "Success");
    setTimeout(() => {
      toast.error("Invalid credentials provided.", "Login Failed");
    }, 1000);
    setTimeout(() => {
      toast.warning("Please verify your email address.", "Email Verification");
    }, 2000);
    setTimeout(() => {
      toast.info("Session will expire in 5 minutes.", "Session Info");
    }, 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold">Authentication Test</h2>
      
      {/* Auth Status */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Authentication Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-semibold">Status:</span>{" "}
              <span className={`badge ${isAuthenticated ? "badge-success" : "badge-error"}`}>
                {isAuthenticated ? "Authenticated" : "Not Authenticated"}
              </span>
            </div>
            <div>
              <span className="font-semibold">Loading:</span>{" "}
              <span className={`badge ${isLoading ? "badge-warning" : "badge-neutral"}`}>
                {isLoading ? "Yes" : "No"}
              </span>
            </div>
          </div>
          
          {user && (
            <div className="mt-4">
              <h4 className="font-semibold">User Information:</h4>
              <div className="bg-base-200 p-3 rounded mt-2">
                <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Organization:</strong> {user.org || "N/A"}</p>
                <p><strong>Industry:</strong> {user.industry || "N/A"}</p>
                <p><strong>Admin:</strong> {user.admin ? "Yes" : "No"}</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-4">
              <div className="alert alert-error">
                <span>Error: {error}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Buttons */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Authentication Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              className="btn btn-primary"
              onClick={testLogin}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Test Login"}
            </button>
            
            <button
              className="btn btn-secondary"
              onClick={testRegister}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Test Register"}
            </button>
            
            <button
              className="btn btn-accent"
              onClick={testVerify}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Verify Token"}
            </button>
            
            <button
              className="btn btn-warning"
              onClick={testLogout}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Test Logout"}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Test */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Toast Notifications</h3>
          <button
            className="btn btn-info w-fit"
            onClick={testToasts}
          >
            Test All Toast Types
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Instructions</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Test Login:</strong> Uses testuser@example.com / testpassword123</p>
            <p><strong>Test Register:</strong> Uses newuser@example.com with sample data</p>
            <p><strong>Verify Token:</strong> Checks if current session is valid</p>
            <p><strong>Test Logout:</strong> Logs out the current user</p>
            <p><strong>Toast Test:</strong> Shows all toast notification types</p>
          </div>
        </div>
      </div>
    </div>
  );
}