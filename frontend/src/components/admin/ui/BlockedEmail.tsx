import { z } from "zod";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { Mail, Trash2, Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient, useMutation } from "@tanstack/react-query";

import { adminAPI } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

const addEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type AddEmailFormData = z.infer<typeof addEmailSchema>;

export default function BlockedEmailItem({
  blockedEmail,
}: {
  blockedEmail: string;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { reset: resetEmail } = useForm<AddEmailFormData>({
    resolver: zodResolver(addEmailSchema),
  });

  const manageEmailMutation = useMutation({
    mutationFn: adminAPI.manageBlockedEmail,
    onSuccess: (data) => {
      toast.success(data.message, "Email List Updated");
      queryClient.invalidateQueries({ queryKey: ["blockedEmails"] });
      resetEmail();
    },
    onError: (error: unknown) => {
      if (error instanceof AxiosError) {
        toast.error(
          error.response?.data?.message || "Failed to manage email",
          "Action Failed"
        );
      } else {
        toast.error(error as string, "Action Failed");
      }
    },
  });

  const handleRemoveEmail = (email: string) => {
    if (window.confirm(`Are you sure you want to unblock ${email}?`)) {
      manageEmailMutation.mutate({
        email,
        action: "remove",
      });
    }
  };
  return (
    <div
      key={blockedEmail}
      className="flex items-center justify-between p-4 border border-base-200 rounded-lg hover:bg-base-200/30"
    >
      <div className="flex items-center gap-3">
        <Mail className="w-5 h-5 text-error" />
        <div>
          <div className="font-medium">{blockedEmail}</div>
        </div>
      </div>

      <button
        onClick={() => handleRemoveEmail(blockedEmail)}
        disabled={manageEmailMutation.isPending}
        className="btn btn-accent btn-sm"
        title="Unblock email"
      >
        {manageEmailMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
