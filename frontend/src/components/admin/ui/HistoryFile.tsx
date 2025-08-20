import { useMutation } from "@tanstack/react-query";
import { Database, FileSpreadsheet, Loader2, Download } from "lucide-react";

import { adminAPI } from "@/lib/api";
import type { HistoryFile } from "@/types/api";
import { useToast } from "@/contexts/ToastContext";
import { AxiosError } from "axios";

type HistoryFileProps = {
  file: HistoryFile;
};

const getFileTypeIcon = (filename: string) => {
  if (filename.endsWith(".zip")) {
    return <Database className="w-5 h-5 text-info" />;
  }
  return <FileSpreadsheet className="w-5 h-5 text-success" />;
};

const getFileTypeBadge = (filename: string) => {
  if (filename.endsWith(".zip")) {
    return <span className="badge badge-info badge-sm">ZIP</span>;
  }
  return <span className="badge badge-success badge-sm">XLSX</span>;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default function HistoryFileItem({ file }: HistoryFileProps) {
  const toast = useToast();

  const downloadHistoryMutation = useMutation({
    mutationFn: adminAPI.downloadHistoryFile,
    onSuccess: (blob, variables) => {
      // Create download link for the history file
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = variables.filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(
        `${variables.filename} downloaded successfully!`,
        "Download Complete"
      );
    },
    onError: (error: unknown) => {
      if (error instanceof AxiosError) {
        toast.error(
          error.response?.data?.message || "Failed to download file",
          "Download Failed"
        );
      } else {
        toast.error(error as string, "Download Failed");
      }
    },
  });

  const handleDownloadHistory = (filename: string) => {
    downloadHistoryMutation.mutate({ filename });
  };

  return (
    <div
      key={file.filename}
      className="flex items-center justify-between p-4 border border-base-200 rounded-lg hover:bg-base-200/30"
    >
      <div className="flex items-center gap-3">
        {getFileTypeIcon(file.filename)}
        <div>
          <div className="font-medium flex items-center gap-2">
            {file.filename}
            {getFileTypeBadge(file.filename)}
          </div>
          <div className="text-sm text-base-content/60">
            {formatFileSize(file.size)} • {file.date}
          </div>
        </div>
      </div>

      <button
        onClick={() => handleDownloadHistory(file.filename)}
        disabled={downloadHistoryMutation.isPending}
        className="btn btn-success btn-sm"
      >
        {downloadHistoryMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
