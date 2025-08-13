// import { useState } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";

import LoginForm from "@/components/forms/LoginForm";
import { useAppSelector } from "../hooks/useAppDispatch";
import AlignerTable from "@/components/aligner/AlignerTable";
import ForgotPassword from "@/components/forms/ForgotPassword";

export function HomePage() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedTranscriptionMode, setSelectedTranscriptionMode] =
    useState<string>("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleTranscriptionSelect = (mode: string) => {
    setSelectedTranscriptionMode(mode);
    setShowTranscriptionModal(false);
    setShowUploadModal(true);
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

            {/* Authentication Section - only for non-authenticated users */}
            {!isAuthenticated && (
              <>
                {/* Toggle between sign-in and forgot password */}
                <div id="login" className="mt-4">
                  <LoginForm />
                </div>
                <div className="mt-4">
                  <ForgotPassword />
                </div>
              </>
            )}
          </div>
        </div>
        {/* Right Column - col-md-4 */}
        <div className="md:col-span-4">
          <div className="card bg-base-100 shadow-lg min-h-[250px] xl:min-h-[300px] p-3 h-full">
            <h5 className="text-xl font-bold">Nordic languages</h5>
            <div className="space-y-2">
              {/* Placeholder Nordic languages with flag placeholders */}
              {[
                { name: "Danish", href: "#" },
                { name: "Norwegian", href: "#" },
                { name: "Swedish", href: "#" },
                { name: "Icelandic", href: "#" },
                { name: "Faroese", href: "#" },
              ].map((lang, index) => (
                <div key={index} className="flex items-center my-2">
                  <div className="w-full">
                    <a
                      href={lang.href}
                      className="text-black no-underline hover:text-primary transition-colors flex items-center font-normal text-lg"
                    >
                      <div className="w-6 h-4 bg-gray-300 rounded-sm mr-4 flex-shrink-0"></div>
                      {lang.name}
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <h5 className="text-xl font-bold">Other languages</h5>
            <div className="space-y-2 mb-4">
              {/* Placeholder other languages */}
              {[
                { name: "English (US)", href: "#" },
                { name: "English (UK)", href: "#" },
                { name: "German", href: "#" },
                { name: "French", href: "#" },
                { name: "Spanish", href: "#" },
              ].map((lang, index) => (
                <div key={index} className="flex items-center my-2">
                  <div className="w-full">
                    <a
                      href={lang.href}
                      className="text-black no-underline hover:text-primary transition-colors flex items-center font-normal text-lg"
                    >
                      <div className="w-6 h-4 bg-gray-300 rounded-sm mr-4 flex-shrink-0"></div>
                      {lang.name}
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <p
              className="text-secondary text-sm italic cursor-pointer hover:text-primary transition-colors"
              tabIndex={0}
            >
              click for a full list
            </p>

            <h5 className="text-xl font-bold mt-4">Engines</h5>
            <div className="space-y-2">
              {[
                {
                  name: "Montreal Forced Aligner",
                  href: "https://montreal-forced-aligner.readthedocs.io/",
                },
                {
                  name: "FAVE-Align",
                  href: "https://github.com/JoFrhwld/FAVE",
                },
                {
                  name: "faseAlign",
                  href: "https://github.com/EricWilbanks/faseAlign",
                },
              ].map((engine, index) => (
                <div key={index} className="flex items-center my-2">
                  <div className="w-full">
                    <a
                      href={engine.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black no-underline hover:text-primary transition-colors flex items-center font-normal text-lg"
                    >
                      <div className="w-6 h-4 bg-gray-300 rounded-sm mr-4 flex-shrink-0"></div>
                      {engine.name}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Anonymous Table Section - only for non-authenticated users and if site is active */}
      {!isAuthenticated && (
        <div className="py-3">
          <AlignerTable title="Align files here" />
          <div className="p-3">
            <p className="text-[#949494] text-sm">
              * Files under 100MB may be aligned without an account. To align
              batches as large as 750 MB and to access advanced features,{" "}
              <Link
                to="/register"
                className="text-[#949494] no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors mx-0"
              >
                create a free account here.
              </Link>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
