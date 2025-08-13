import { Copy } from "lucide-react";

export function SupportPage() {
  return (
    <>
      <h1 className="text-[3.5rem] leading-[1.1] text-left mb-4 pb-4">
        Contact Us
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        <div className="md:col-span-4 py-0">
          <div className="card bg-base-100 shadow-lg border-0 p-3 h-full">
            We're here to help! If you have any questions, feedback, or
            encounter any issues with our service, please don't hesitate to
            reach out to us. Fill out the form below, and we'll get back to you
            as soon as possible.
          </div>
        </div>
        <div className="md:col-span-8 py-0">
          <div className="card bg-base-100 shadow-lg border-0 p-3 h-full">
            <form>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-2">
                <div className="md:col-span-3">
                  <input
                    type="text"
                    className="input"
                    required
                    placeholder="Your Name"
                  />
                </div>
                <div className="md:col-span-3">
                  <input
                    type="email"
                    className="input"
                    required
                    placeholder="Your Email"
                  />
                </div>
                <div className="md:col-span-6">
                  <input
                    type="text"
                    className="input w-full"
                    required
                    placeholder="Subject"
                  />
                </div>
                <div className="md:col-span-6">
                  <textarea
                    className="textarea w-full"
                    placeholder="Message"
                  ></textarea>
                </div>
              </div>
              <div className="tooltip cursor-pointer" data-tip="Copy message">
                <Copy strokeWidth={0.5} />
              </div>
              <div className="text-center">
                <button type="submit" className="btn btn-primary font-thin">
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
