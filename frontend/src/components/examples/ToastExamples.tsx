import { useToast } from "../../hooks/useToast";

export function ToastExamples() {
  const toast = useToast();

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Toast Examples</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Success Toast */}
        <button
          className="btn btn-success"
          onClick={() => toast.success("File uploaded successfully!", "Success")}
        >
          Success Toast
        </button>

        {/* Error Toast */}
        <button
          className="btn btn-error"
          onClick={() => toast.error("Failed to upload file. Please try again.", "Upload Error")}
        >
          Error Toast
        </button>

        {/* Warning Toast */}
        <button
          className="btn btn-warning"
          onClick={() => toast.warning("File size is larger than recommended (750MB)", "Warning")}
        >
          Warning Toast
        </button>

        {/* Info Toast */}
        <button
          className="btn btn-info"
          onClick={() => toast.info("Processing your files... This may take a few minutes.", "Processing")}
        >
          Info Toast
        </button>
      </div>

      <div className="divider"></div>

      <h3 className="text-xl font-semibold">Advanced Examples</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Toast with Action */}
        <button
          className="btn btn-outline"
          onClick={() => 
            toast.addToast({
              type: "warning",
              title: "Unsaved Changes",
              message: "You have unsaved changes. Do you want to save them?",
              duration: 0, // Won't auto-dismiss
              action: {
                label: "Save",
                onClick: () => {
                  toast.success("Changes saved successfully!");
                }
              }
            })
          }
        >
          Toast with Action
        </button>

        {/* Long Duration Toast */}
        <button
          className="btn btn-outline"
          onClick={() => 
            toast.info(
              "This toast will stay for 10 seconds to give you time to read the message.",
              "Long Message",
              10000
            )
          }
        >
          10-Second Toast
        </button>

        {/* Persistent Toast */}
        <button
          className="btn btn-outline"
          onClick={() => 
            toast.addToast({
              type: "error",
              title: "Connection Lost",
              message: "Unable to connect to server. Please check your internet connection.",
              duration: 0 // Won't auto-dismiss
            })
          }
        >
          Persistent Toast
        </button>

        {/* Custom Duration */}
        <button
          className="btn btn-outline"
          onClick={() => toast.success("Quick notification!", undefined, 2000)}
        >
          2-Second Toast
        </button>
      </div>

      <div className="divider"></div>

      <h3 className="text-xl font-semibold">Real-World Examples</h3>
      
      <div className="space-y-2">
        <button
          className="btn btn-primary w-full"
          onClick={() => simulateFileUpload()}
        >
          Simulate File Upload (with Progress)
        </button>

        <button
          className="btn btn-secondary w-full"
          onClick={() => simulateFormValidation()}
        >
          Simulate Form Validation
        </button>

        <button
          className="btn btn-accent w-full"
          onClick={() => simulateNetworkError()}
        >
          Simulate Network Error
        </button>
      </div>
    </div>
  );

  function simulateFileUpload() {
    toast.info("Starting file upload...", "Upload");
    
    setTimeout(() => {
      toast.warning("Upload is taking longer than expected...", "Still Processing", 3000);
    }, 2000);
    
    setTimeout(() => {
      toast.success("File uploaded and processed successfully!", "Upload Complete");
    }, 5000);
  }

  function simulateFormValidation() {
    toast.error("Please fill in all required fields", "Validation Error");
    
    setTimeout(() => {
      toast.warning("Email format is invalid", "Email Error", 3000);
    }, 1000);
    
    setTimeout(() => {
      toast.success("Form submitted successfully!", "Success");
    }, 3000);
  }

  function simulateNetworkError() {
    toast.addToast({
      type: "error",
      title: "Network Error",
      message: "Unable to connect to the server. Please try again.",
      duration: 0,
      action: {
        label: "Retry",
        onClick: () => {
          toast.info("Retrying connection...", "Reconnecting");
          setTimeout(() => {
            toast.success("Connection restored!", "Connected");
          }, 2000);
        }
      }
    });
  }
}