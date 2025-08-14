# Toast Management System Usage

This project includes a global toast management system using DaisyUI toasts positioned at `toast-top toast-end`.

## Basic Usage

```tsx
import { useToast } from "../../hooks/useToast";

function MyComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success("Operation completed successfully!");
  };

  const handleError = () => {
    toast.error("Something went wrong!", "Error");
  };

  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={handleError}>Show Error</button>
    </div>
  );
}
```

## API Reference

### Quick Methods

- `toast.success(message, title?, duration?)` - Green success toast
- `toast.error(message, title?, duration?)` - Red error toast  
- `toast.warning(message, title?, duration?)` - Yellow warning toast
- `toast.info(message, title?, duration?)` - Blue info toast

### Advanced Method

```tsx
toast.addToast({
  type: "success" | "error" | "warning" | "info",
  title?: string,
  message: string,
  duration?: number, // milliseconds, 0 = no auto-dismiss
  action?: {
    label: string,
    onClick: () => void
  }
});
```

## Examples

### Form Validation
```tsx
const handleSubmit = (data) => {
  if (!data.email) {
    toast.error("Email is required", "Validation Error");
    return;
  }
  
  if (!isValidEmail(data.email)) {
    toast.warning("Please enter a valid email address");
    return;
  }
  
  toast.success("Form submitted successfully!");
};
```

### File Upload
```tsx
const handleUpload = async (file) => {
  toast.info("Uploading file...", "Upload");
  
  try {
    await uploadFile(file);
    toast.success("File uploaded successfully!", "Success");
  } catch (error) {
    toast.error("Failed to upload file. Please try again.", "Upload Error");
  }
};
```

### Network Errors with Retry
```tsx
const handleApiCall = async () => {
  try {
    await fetchData();
  } catch (error) {
    toast.addToast({
      type: "error",
      title: "Network Error",
      message: "Unable to connect to server",
      duration: 0,
      action: {
        label: "Retry",
        onClick: () => handleApiCall()
      }
    });
  }
};
```

### Long Running Operations
```tsx
const handleLongOperation = async () => {
  toast.info("Processing... This may take a few minutes", "Processing", 0);
  
  try {
    await longRunningTask();
    toast.success("Processing completed!", "Done");
  } catch (error) {
    toast.error("Processing failed", "Error");
  }
};
```

## Configuration

Default duration is 5 seconds. Set `duration: 0` for persistent toasts that require manual dismissal.

Toasts automatically stack and are positioned at the top-right corner of the screen.