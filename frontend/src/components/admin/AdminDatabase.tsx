import { useState } from "react";
import {
  Database,
  Download,
  FileSpreadsheet,
  Users,
  History,
  Calendar,
  Loader2,
  FileX,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { adminAPI } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import type { GenerateUserReportRequest } from "@/types/api";
import HistoryFileItem from "./ui/HistoryFile";
import { AxiosError } from "axios";

export default function AdminDatabase() {
  const [userLimitDate, setUserLimitDate] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const toast = useToast();

  const {
    data: historyFiles,
    isLoading: loadingHistory,
    error: historyError,
  } = useQuery({
    queryKey: ["historySpreadsheets"],
    queryFn: adminAPI.getHistorySpreadsheets,
  });

  const generateUserReportMutation = useMutation({
    mutationFn: adminAPI.generateUserReport,
    onSuccess: (blob, variables) => {
      // Create download link for the Excel file
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename based on filters
      const dateStr = variables.user_limit
        ? variables.user_limit.replace(/-/g, "")
        : "all";
      const deletedStr = variables.include_deleted ? "_with_deleted" : "";
      link.download = `users_report_${dateStr}${deletedStr}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(
        "User report generated and downloaded successfully!",
        "Download Complete"
      );
    },
    onError: (error: unknown) => {
      if (error instanceof AxiosError) {
        toast.error(
          error.response?.data?.message || "Failed to generate user report",
          "Generation Failed"
        );
      } else {
        toast.error(error as string, "Generation Failed");
      }
    },
  });

  const handleGenerateUserReport = () => {
    const data: GenerateUserReportRequest = {
      include_deleted: includeDeleted,
    };

    if (userLimitDate) {
      data.user_limit = userLimitDate;
    }

    generateUserReportMutation.mutate(data);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl leading-[1.1] text-left mb-2">
            Database Management
          </h1>
          <p className="text-base-content/70">
            Generate reports and download backup files
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          <span className="text-lg font-medium text-primary">
            Excel Reports
          </span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Reports Section */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-header p-6 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">User Reports</h2>
                <p className="text-sm text-base-content/70">
                  Generate Excel reports for user data
                </p>
              </div>
            </div>
          </div>

          <div className="card-body p-6">
            {/* Filter Options */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="label">
                  <span className="label-text font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Limit to Date (Optional)
                  </span>
                </label>
                <input
                  type="date"
                  value={userLimitDate}
                  onChange={(e) => setUserLimitDate(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Leave empty for all users"
                />
                <label className="label">
                  <span className="label-text-alt">
                    Only include users created on or before this date
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    checked={includeDeleted}
                    onChange={(e) => setIncludeDeleted(e.target.checked)}
                    className="checkbox checkbox-primary"
                  />
                  <div>
                    <div className="label-text font-medium flex items-center gap-2">
                      Include Deleted Users
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateUserReport}
              disabled={generateUserReportMutation.isPending}
              className="btn btn-primary font-thin w-full"
            >
              {generateUserReportMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Generate User Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* History Files Section */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-header p-6 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="bg-success/10 p-2 rounded-lg">
                <History className="w-6 h-6 text-success" />
              </div>
              <div>
                <h2 className="text-xl font-bold">History Files</h2>
                <p className="text-sm text-base-content/70">
                  Download existing backup files
                </p>
              </div>
            </div>
          </div>

          <div className="card-body p-6 max-h-[15rem] overflow-auto">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span>Loading history files...</span>
                </div>
              </div>
            ) : historyError ? (
              <div className="text-center py-8">
                <FileX className="w-12 h-12 text-error mx-auto mb-4" />
                <p className="text-error font-medium">
                  Failed to load history files
                </p>
                <p className="text-sm text-base-content/60">
                  Please try refreshing the page
                </p>
              </div>
            ) : historyFiles && historyFiles.length > 0 ? (
              <div className="space-y-3">
                {historyFiles.map((file) => (
                  <HistoryFileItem key={file.filename} file={file} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileSpreadsheet className="w-12 h-12 text-base-content/20 mx-auto mb-4" />
                <p className="text-base-content/60">
                  No history files available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="card bg-base-100 shadow-lg border border-base-200 mt-6">
        <div className="card-body p-6">
          <h3 className="text-lg font-bold mb-4">About Database Files</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                User Reports
              </h4>
              <ul className="text-sm text-base-content/70 space-y-1">
                <li>• Contains user account information and statistics</li>
                <li>• Can be filtered by registration date</li>
                <li>• Option to include or exclude deleted users</li>
                <li>• Generated in real-time with current data</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <History className="w-4 h-4 text-success" />
                History Files
              </h4>
              <ul className="text-sm text-base-content/70 space-y-1">
                <li>• Pre-generated backup files from scheduled exports</li>
                <li>• Available in both XLSX and ZIP formats</li>
                <li>• Contains historical task and user data</li>
                <li>• Updated according to backup schedule</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
