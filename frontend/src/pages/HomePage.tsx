// import { useState } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";

import LoginForm from "@/components/forms/LoginForm";
import { useAppSelector } from "../hooks/useAppDispatch";
import Aligner from "@/components/aligner/Aligner";
import ForgotPassword from "@/components/forms/ForgotPassword";
import { SupportedEngines } from "../components/home/SupportedEngines";
import { SupportedLanguages } from "../components/home/SupportedLanguages";
import { useConfig, useAppDegradedState } from "../contexts/AppConfigContext";

export function HomePage() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { status, isLoading: siteStatusLoading } = useAppSelector(
    (state) => state.siteStatus
  );
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const config = useConfig();
  const { isDegraded } = useAppDegradedState();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderMaintenanceMessage = (message: string) => {
    return message.split("\n").map((line, index) => (
      <p key={index} className="mb-2">
        {line}
      </p>
    ));
  };

  return (
    <>
      <h6 className="font-normal uppercase text-xl tracking-wide mb-2 text-left">
        Automatic phonetic annotation & online forced aligner
      </h6>

      <h1 className="text-[3.5rem] leading-[1.1] font-black text-left flex items-center justify-start gap-2 align-center">
        <img
          src="/favicon.png"
          alt="Icon"
          className="w-[0.75em] h-[0.75em] align-baseline mb-4"
        />
        Autophon
      </h1>

      {/* Main row g-4 grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        {/* Left Column - col-md-8 */}
        <div className="md:col-span-8 py-0">
          {/* Card matching home-card styling */}
          <div className="card bg-base-100 shadow-lg min-h-[250px] xl:min-h-[300px] border-0 p-3 h-full">
            <h5 className="text-xl font-bold">What the app does</h5>
            <div className="space-y-4">
              <p className="text-base leading-relaxed">
                Autophon is a web app that offers <strong>free</strong> online
                forced alignment, transforming an audio file and its
                corresponding transcript into a time-aligned phonetic annotation
                readable in{" "}
                <a
                  href="https://www.fon.hum.uva.nl/praat/"
                  className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Praat
                </a>
                . <em>Forced alignment</em> refers to the process by which a
                computational model identifies the time intervals in the audio
                that contain each phonetic segment. Autophon utilizes a number
                of engines for its backend, including the{" "}
                <a
                  href="https://montreal-forced-aligner.readthedocs.io/en/v1.0/"
                  className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Montreal Forced Aligner 1.0
                </a>{" "}
                <a
                  href="https://montreal-forced-aligner.readthedocs.io"
                  className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  and 2.0
                </a>
                ,{" "}
                <a
                  href="https://github.com/JoFrhwld/FAVE"
                  className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Fave-Align
                </a>
                , and{" "}
                <a
                  href="https://github.com/EricWilbanks/faseAlign"
                  className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  faseAlign
                </a>{" "}
                with language-specific models trained on both read-aloud and
                spontaneous speech. Users can access detailed guides by
                selecting a language and engine from the list on the right.{" "}
                <Link
                  to="/about"
                  className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors mx-0"
                >
                  How does it work?
                </Link>
              </p>
            </div>

            {/* Loading state for site status */}
            {siteStatusLoading && (
              <div className="mt-4 text-center" aria-live="polite">
                <div className="loading loading-spinner loading-md"></div>
                <span className="ml-2 text-sm text-gray-500">Loading...</span>
              </div>
            )}

            {/* Authentication Section - only for non-authenticated users and active site */}
            {!isAuthenticated && !siteStatusLoading && status?.active && (
              <>
                {/* Toggle between sign-in and forgot password */}
                <div id="login" className="mt-4">
                  {!showForgotPassword ? (
                    <LoginForm
                      onForgotPasswordClick={() => setShowForgotPassword(true)}
                    />
                  ) : (
                    <div>
                      <ForgotPassword />
                      <div className="mt-4">
                        <button
                          onClick={() => setShowForgotPassword(false)}
                          className="text-primary hover:underline text-sm"
                        >
                          ← Back to Login
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Site Maintenance Section */}
            {!siteStatusLoading &&
              status &&
              !status.active &&
              status.start_date &&
              status.end_date && (
                <section
                  className="mt-4"
                  role="alert"
                  aria-labelledby="maintenance-title"
                  aria-describedby="maintenance-description"
                >
                  <h5 id="maintenance-title" className="text-xl font-bold my-2">
                    Autophon is closed from {formatDate(status.start_date)}{" "}
                    through {formatDate(status.end_date)}
                  </h5>
                  <div
                    id="maintenance-description"
                    className="p-3 rounded border border-accent"
                  >
                    {status.inactive_message ? (
                      renderMaintenanceMessage(status.inactive_message)
                    ) : (
                      <p>
                        Autophon is currently undergoing maintenance. Please
                        check back later.
                      </p>
                    )}
                  </div>
                </section>
              )}
          </div>
        </div>
        {/* Right Column - col-md-4 */}
        <div className="md:col-span-4">
          <div className="card bg-base-100 shadow-lg min-h-[250px] xl:min-h-[300px] p-3 h-full">
            <SupportedLanguages />

            <SupportedEngines />
          </div>
        </div>
      </div>

      {/* Anonymous Table Section - only for non-authenticated users and if site is active */}
      {!isAuthenticated && !siteStatusLoading && status?.active && (
        <div className="py-3">
          <Aligner title="Align files here" homepage />
          <div className="p-3">
            {config?.userLimits && config.audioExtensions && (
              <>
                <p className="text-[#949494] text-sm">
                  * Files under {config.userLimits.a_size_limit / 1000 || 100}MB
                  may be aligned without an account. To align batches as large
                  as {config.userLimits.size_limit / 1000 || 750} MB and to
                  access advanced features,{" "}
                  <Link
                    to="/register"
                    className="text-[#949494] no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors mx-0"
                  >
                    create a free account here.
                  </Link>
                </p>
                <p className="text-[#949494] text-xs mt-2">
                  Supported audio formats: {config.audioExtensions.join(", ")}
                </p>
              </>
            )}
            {isDegraded && (
              <div className="alert alert-warning mt-2">
                <svg
                  className="stroke-current shrink-0 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <span className="text-xs">
                  App configuration unavailable - using default limits
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
