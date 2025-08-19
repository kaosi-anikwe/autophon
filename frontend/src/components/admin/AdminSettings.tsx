import { z } from "zod";
import { useEffect } from "react";
import {
  Settings,
  Globe,
  Shield,
  UserX,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Mail,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { adminAPI } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import type { UpdateSiteStatusRequest } from "@/types/api";
import { fetchSiteStatus } from "../../store/siteStatusSlice";

const siteStatusSchema = z.object({
  active: z.boolean(),
  start_date: z.string(),
  end_date: z.string(),
  inactive_message: z.string(),
});

const addEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type SiteStatusFormData = z.infer<typeof siteStatusSchema>;
type AddEmailFormData = z.infer<typeof addEmailSchema>;

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const dispatch = useAppDispatch();

  const { data: siteStatus, isLoading: loadingSiteStatus } = useQuery({
    queryKey: ["siteStatus"],
    queryFn: adminAPI.getSiteStatus,
  });

  const { data: blockedEmails, isLoading: loadingBlockedEmails } = useQuery({
    queryKey: ["blockedEmails"],
    queryFn: adminAPI.getBlockedEmails,
  });

  const {
    register: registerSiteStatus,
    handleSubmit: handleSiteStatusSubmit,
    reset: resetSiteStatus,
    watch,
  } = useForm<SiteStatusFormData>({
    resolver: zodResolver(siteStatusSchema),
  });

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    reset: resetEmail,
    formState: { errors: emailErrors },
  } = useForm<AddEmailFormData>({
    resolver: zodResolver(addEmailSchema),
  });

  const isActive = watch("active");

  useEffect(() => {
    if (siteStatus) {
      resetSiteStatus({
        active: siteStatus.active,
        start_date: siteStatus.start_date || "",
        end_date: siteStatus.end_date || "",
        inactive_message: siteStatus.inactive_message || "",
      });
    }
  }, [siteStatus, resetSiteStatus]);

  const updateSiteStatusMutation = useMutation({
    mutationFn: adminAPI.updateSiteStatus,
    onSuccess: (data) => {
      toast.success(data.message, "Site Status Updated");
      queryClient.invalidateQueries({ queryKey: ["siteStatus"] });
      dispatch(fetchSiteStatus());
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update site status",
        "Update Failed"
      );
    },
  });

  const manageEmailMutation = useMutation({
    mutationFn: adminAPI.manageBlockedEmail,
    onSuccess: (data) => {
      toast.success(data.message, "Email List Updated");
      queryClient.invalidateQueries({ queryKey: ["blockedEmails"] });
      resetEmail();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to manage email",
        "Action Failed"
      );
    },
  });

  const onSiteStatusSubmit = (data: SiteStatusFormData) => {
    const updateData: UpdateSiteStatusRequest = {
      active: data.active,
    };

    if (!data.active) {
      if (data.start_date) updateData.start_date = data.start_date;
      if (data.end_date) updateData.end_date = data.end_date;
      if (data.inactive_message)
        updateData.inactive_message = data.inactive_message;
    }

    updateSiteStatusMutation.mutate(updateData);
  };

  const onAddEmailSubmit = (data: AddEmailFormData) => {
    manageEmailMutation.mutate({
      email: data.email,
      action: "add",
    });
  };

  const handleRemoveEmail = (email: string) => {
    if (window.confirm(`Are you sure you want to unblock ${email}?`)) {
      manageEmailMutation.mutate({
        email,
        action: "remove",
      });
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl leading-[1.1] text-left mb-2">
            Site Settings
          </h1>
          <p className="text-base-content/70">
            Manage site status and blocked emails
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          <span className="text-lg font-medium text-primary">
            Admin Controls
          </span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Site Status Section */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-header p-6 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Site Status</h2>
                <p className="text-sm text-base-content/70">
                  Control site availability
                </p>
              </div>
            </div>
          </div>

          <div className="card-body p-6">
            {loadingSiteStatus ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="ml-2">Loading site status...</span>
              </div>
            ) : (
              <form
                onSubmit={handleSiteStatusSubmit(onSiteStatusSubmit)}
                className="space-y-4"
              >
                {/* Current Status Display */}
                <div className="alert">
                  <div className="flex items-center gap-2">
                    {siteStatus?.active ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <XCircle className="w-5 h-5 text-error" />
                    )}
                    <span className="font-medium">
                      Site is currently{" "}
                      {siteStatus?.active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      {...registerSiteStatus("active")}
                      type="checkbox"
                      className="toggle toggle-primary"
                    />
                    <div>
                      <div className="label-text font-medium">Site Active</div>
                      <div className="label-text-alt">
                        Allow users to access the site
                      </div>
                    </div>
                  </label>
                </div>

                {/* Maintenance Fields (only show when inactive) */}
                {!isActive && (
                  <div className="space-y-4 p-4 bg-warning/5 rounded-lg border border-warning/20">
                    <div className="flex items-center gap-2 text-warning">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">
                        Maintenance Mode Settings
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">
                          <span className="label-text flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Start Date (Optional)
                          </span>
                        </label>
                        <input
                          {...registerSiteStatus("start_date")}
                          type="date"
                          className="input input-bordered w-full"
                        />
                      </div>

                      <div>
                        <label className="label">
                          <span className="label-text flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            End Date (Optional)
                          </span>
                        </label>
                        <input
                          {...registerSiteStatus("end_date")}
                          type="date"
                          className="input input-bordered w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text">Maintenance Message</span>
                      </label>
                      <textarea
                        {...registerSiteStatus("inactive_message")}
                        className="textarea textarea-bordered w-full"
                        placeholder="The site is currently under maintenance. Please check back later."
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={updateSiteStatusMutation.isPending}
                  className="btn btn-primary font-thin w-full"
                >
                  {updateSiteStatusMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Site Status"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Blocked Emails Section */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-header p-6 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="bg-error/10 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-error" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Blocked Emails</h2>
                <p className="text-sm text-base-content/70">
                  Manage blocked email addresses
                </p>
              </div>
            </div>
          </div>

          <div className="card-body p-6">
            {/* Add New Email Form */}
            <form
              onSubmit={handleEmailSubmit(onAddEmailSubmit)}
              className="mb-6"
            >
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    {...registerEmail("email")}
                    type="email"
                    placeholder="Enter email to block..."
                    className={`input input-bordered w-full ${
                      emailErrors.email ? "input-error" : ""
                    }`}
                  />
                  {emailErrors.email && (
                    <span className="text-error text-sm mt-1">
                      {emailErrors.email.message}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={manageEmailMutation.isPending}
                  className="btn btn-error"
                >
                  {manageEmailMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Block
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Blocked Emails List */}
            {loadingBlockedEmails ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="ml-2">Loading blocked emails...</span>
              </div>
            ) : blockedEmails && blockedEmails.length > 0 ? (
              <div className="space-y-3">
                {blockedEmails.map((blockedEmail) => (
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
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserX className="w-12 h-12 text-base-content/20 mx-auto mb-4" />
                <p className="text-base-content/60">No blocked emails</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Information Panel */}
      <div className="card bg-base-100 shadow-lg border border-base-200 mt-6">
        <div className="card-body p-6">
          <h3 className="text-lg font-bold mb-4">Settings Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Site Status Control
              </h4>
              <ul className="text-sm text-base-content/70 space-y-1">
                <li>• Deactivate site for maintenance or emergencies</li>
                <li>
                  • Set optional start and end dates for planned maintenance
                </li>
                <li>• Customize maintenance message shown to users</li>
                <li>• Existing user are removed during maintenance</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-error" />
                Email Blocking
              </h4>
              <ul className="text-sm text-base-content/70 space-y-1">
                <li>
                  • Block specific email addresses from registration and site
                  access
                </li>
                <li>• Existing users with blocked emails will be logged out</li>
                <li>• Blocked user accounts will be deleted immediately</li>
                <li>• Easily unblock emails when needed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
