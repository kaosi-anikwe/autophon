import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, getErrorMessage } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Message is required"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export function SupportPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyIcon, setCopyIcon] = useState("copy");
  const [tooltipText, setTooltipText] = useState("Copy text");
  const toast = useToast();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const formData = watch();

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      await api.post("/contact/send-email", data);
      toast.success("Your message has been sent successfully! We'll get back to you soon.", "Message Sent");
      reset();
    } catch (error) {
      toast.error(getErrorMessage(error), "Failed to Send Message");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    const textToCopy = `Name: ${formData.name || ""}
Email: ${formData.email || ""}
Subject: ${formData.subject || ""}
Message: ${formData.body || ""}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyIcon("check");
      setTooltipText("Copied!");
      
      setTimeout(() => {
        setCopyIcon("copy");
        setTooltipText("Copy text");
      }, 2000);
      
      toast.success("Form content copied to clipboard", "Copied");
    } catch (error) {
      toast.error("Failed to copy to clipboard", "Copy Failed");
    }
  };

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
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-2">
                <div className="md:col-span-3">
                  <input
                    {...register("name")}
                    type="text"
                    className={`input w-full ${errors.name ? "input-error" : ""}`}
                    placeholder="Your Name"
                    disabled={isSubmitting}
                  />
                  {errors.name && (
                    <span className="text-error text-sm">{errors.name.message}</span>
                  )}
                </div>
                <div className="md:col-span-3">
                  <input
                    {...register("email")}
                    type="email"
                    className={`input w-full ${errors.email ? "input-error" : ""}`}
                    placeholder="Your Email"
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <span className="text-error text-sm">{errors.email.message}</span>
                  )}
                </div>
                <div className="md:col-span-6">
                  <input
                    {...register("subject")}
                    type="text"
                    className={`input w-full ${errors.subject ? "input-error" : ""}`}
                    placeholder="Subject"
                    disabled={isSubmitting}
                  />
                  {errors.subject && (
                    <span className="text-error text-sm">{errors.subject.message}</span>
                  )}
                </div>
                <div className="md:col-span-6">
                  <textarea
                    {...register("body")}
                    className={`textarea w-full ${errors.body ? "textarea-error" : ""}`}
                    placeholder="Message"
                    rows={4}
                    disabled={isSubmitting}
                  />
                  {errors.body && (
                    <span className="text-error text-sm">{errors.body.message}</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div 
                  className="tooltip cursor-pointer" 
                  data-tip={tooltipText}
                  onClick={handleCopy}
                >
                  {copyIcon === "copy" ? (
                    <Copy strokeWidth={0.5} className="w-5 h-5 hover:text-primary" />
                  ) : (
                    <Check strokeWidth={0.5} className="w-5 h-5 text-success" />
                  )}
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary font-thin"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Message"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
