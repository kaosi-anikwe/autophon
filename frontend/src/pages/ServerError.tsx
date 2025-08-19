import { Link } from "react-router-dom";
import { Home, RefreshCw, AlertTriangle, Mail } from "lucide-react";

export default function ServerError() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center py-12">
            {/* Error Code */}
            <div className="mb-8 relative">
              <h1 className="text-9xl font-bold text-error opacity-20">500</h1>
              <div className="absolute inset-0 flex items-center justify-center">
                <AlertTriangle className="w-16 h-16 text-error" />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-4 mb-8">
              <h2 className="text-3xl font-bold text-base-content">
                Server Error
              </h2>
              <p className="text-lg text-base-content/70 max-w-md mx-auto">
                Something went wrong on our servers. We're aware of the issue and 
                working to fix it as quickly as possible.
              </p>
            </div>

            {/* Error Details */}
            <div className="bg-base-200 rounded-lg p-6 mb-8 text-left max-w-md mx-auto">
              <h3 className="font-semibold text-base-content mb-3">What happened?</h3>
              <ul className="space-y-2 text-sm text-base-content/70">
                <li className="flex items-start gap-2">
                  <span className="text-error">•</span>
                  Our servers encountered an unexpected error
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-error">•</span>
                  This could be due to high traffic or maintenance
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-error">•</span>
                  Your data and progress are safe
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-error">•</span>
                  Please try again in a few minutes
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                onClick={handleRefresh}
                className="btn btn-primary font-thin gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <Link to="/" className="btn btn-ghost font-thin gap-2">
                <Home className="w-4 h-4" />
                Go to Homepage
              </Link>
            </div>

            {/* Status Information */}
            <div className="alert alert-info">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className="text-sm">
                  If the problem persists, please contact our support team at{" "}
                  <a href="mailto:support@autophon.se" className="link font-medium">
                    support@autophon.se
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
          <Link to="/support" className="link link-primary">
            Contact Support
          </Link>
          <Link to="/about" className="link link-primary">
            About Autophon
          </Link>
          <Link to="/" className="link link-primary">
            Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}