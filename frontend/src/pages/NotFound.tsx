import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center py-12">
            {/* Error Code */}
            <div className="mb-8 relative">
              <h1 className="text-9xl font-bold text-primary opacity-20">
                404
              </h1>
              <div className="absolute inset-0 flex items-center justify-center"></div>
            </div>

            {/* Error Message */}
            <div className="space-y-4 mb-8">
              <h2 className="text-3xl font-bold text-base-content">
                Page Not Found
              </h2>
              <p className="text-lg text-base-content/70 max-w-md mx-auto">
                Sorry, we couldn't find the page you're looking for. The page
                might have been moved, deleted, or the URL might be incorrect.
              </p>
            </div>

            {/* Suggestions */}
            <div className="bg-base-200 rounded-lg p-6 mb-8 text-left max-w-md mx-auto">
              <h3 className="font-semibold text-base-content mb-3">
                What can you do?
              </h3>
              <ul className="space-y-2 text-sm text-base-content/70">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Check the URL for any typing errors
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Go back to the previous page using your browser
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Visit our homepage and navigate from there
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Contact support if you believe this is an error
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.history.back()}
                className="btn btn-ghost font-thin gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
              <Link to="/" className="btn btn-primary font-thin gap-2">
                <Home className="w-4 h-4" />
                Go to Homepage
              </Link>
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
