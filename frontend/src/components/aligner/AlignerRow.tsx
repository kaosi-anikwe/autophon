import { AxiosError } from "axios";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  FileX,
  AlertCircle,
  Play,
  CheckCircle,
  XCircle,
  Folder,
  Folders,
  Trash2,
} from "lucide-react";

import { api } from "@/lib/api";
import LanguageCell from "./LanguageCell";
import EngineCell from "./EngineCell";
import { useToast } from "@/contexts/ToastContext";
import type { Task } from "@/types/api";

type AligerRowProps = {
  task: Task;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  showDeleteButton?: boolean;
  onDelete?: () => void;
};

export default function AlignerRow({
  task,
  checked = false,
  onCheckedChange,
  showDeleteButton = false,
  onDelete,
}: AligerRowProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedLanguageName, setSelectedLanguageName] = useState<
    string | undefined
  >(task.language?.language_name);
  const [shouldOpenEngineDropdown, setShouldOpenEngineDropdown] =
    useState(false);

  // Countdown timer state
  const [countdown, setCountdown] = useState<number | null>(null);
  const [alignmentStartTime, setAlignmentStartTime] = useState<Date | null>(
    null
  );

  // Determine if task has errors
  const hasPreError = task.pre_error === true;
  const isUploading = task.task_status === "uploading";

  // Countdown timer effect
  useEffect(() => {
    if (
      countdown === null ||
      countdown <= 0 ||
      task.task_status !== "aligned"
    ) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown, task.task_status]);

  // Reset countdown when task status changes from aligned
  useEffect(() => {
    if (task.task_status !== "aligned") {
      setCountdown(null);
      setAlignmentStartTime(null);
    }
  }, [task.task_status]);

  // Format countdown time as MM:SS
  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Determine if task should use double folder icon
  const shouldUseDoubleFolderIcon = (): boolean => {
    return (
      task.trans_choice === "exp-a" ||
      task.trans_choice === "comp-ling" ||
      (task as any).batch === true // In case batch property exists but not in type
    );
  };

  // Alignment mutation
  const alignmentMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await api.post(`/aligner/align`, {
        task_id: taskId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Task queued for alignment");

      // Set countdown timer if estimated_duration is provided
      if (data.data?.estimated_duration) {
        setCountdown(data.data.estimated_duration);
        setAlignmentStartTime(new Date());
      }

      // Refetch tasks to update the status
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const errorMessage =
        error.response?.data?.message || "Failed to start alignment";
      toast.error(errorMessage);
    },
  });

  // Generate download URL based on task status
  const getDownloadUrl = () => {
    if (task.task_status === "completed") {
      return `https://new.autophontest.se/api/v1/tasks/${task.task_id}/download/complete`;
    }
    if (task.task_status === "uploaded") {
      return `https://new.autophontest.se/api/v1/tasks/${task.task_id}/download/textgrid`;
    }
    return null;
  };

  const downloadUrl = getDownloadUrl();

  // Render cell content based on status
  const renderCellContent = (
    value: string | number | undefined,
    field: string
  ) => {
    if (
      hasPreError &&
      ["no_of_tiers", "size", "words", "missing_words"].includes(field)
    ) {
      return "N/A";
    }
    if (
      isUploading &&
      ["no_of_tiers", "words", "missing_words"].includes(field)
    ) {
      return <img src="/spinner.gif" alt="Loading..." className="w-auto h-6" />;
    }
    return value || "N/A";
  };

  return (
    <tr
      className={`text-center transition-colors duration-75 ${
        checked
          ? "bg-primary/10 hover:bg-primary/20"
          : "even:bg-base-200/10 hover:bg-base-200/20"
      }`}
    >
      {/* Delete button column */}
      <td className="p-2 w-10">
        <div className="w-4 h-4 flex items-center justify-self-end">
          {showDeleteButton && (
            <div className="tooltip" data-tip="Delete this task">
              <Trash2
                className="w-4 h-4 cursor-pointer text-error hover:text-error/80"
                onClick={onDelete}
              />
            </div>
          )}
        </div>
      </td>

      {/* Checkbox column */}
      <td className="p-2">
        <label>
          <input
            type="checkbox"
            className="checkbox checkbox-xs"
            checked={checked}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
          />
        </label>
      </td>

      {/* File name */}
      <td>
        <div className="flex items-start gap-2">
          {shouldUseDoubleFolderIcon() ? (
            <Folders className="w-4 h-4 text-accent mt-0.5 my-auto" />
          ) : (
            <Folder className="w-4 h-4 text-accent mt-0.5 my-auto" />
          )}
          <div className="flex flex-col">
            <span className="font-medium">{task.download_title}</span>
            <span className="text-xs text-left text-base-content/60">
              {task.download_date}
            </span>
          </div>
        </div>
      </td>

      {/* Language dropdown */}
      <td>
        <LanguageCell
          task={task}
          onLanguageSelected={(languageName) => {
            setSelectedLanguageName(languageName);
            setShouldOpenEngineDropdown(true);
          }}
        />
      </td>

      {/* Engine dropdown */}
      <td>
        <EngineCell
          key={`${task.task_id}-${selectedLanguageName || "no-language"}`}
          task={task}
          selectedLanguageName={selectedLanguageName}
          shouldOpen={shouldOpenEngineDropdown}
          onDropdownOpened={() => setShouldOpenEngineDropdown(false)}
        />
      </td>

      {/* Tiers */}
      <td>{renderCellContent(task.no_of_tiers, "no_of_tiers")}</td>

      {/* Size MB */}
      <td>{task.size ? `${task.size}` : "N/A"}</td>

      {/* Words */}
      <td>{renderCellContent(task.words, "words")}</td>

      {/* Missing Words */}
      <td>{renderCellContent(task.missing_words, "missing_words")}</td>

      {/* Status */}
      <td>
        {isUploading ? (
          <div className="flex items-center gap-2 mx-auto">
            <img src="/spinner.gif" alt="Uploading..." className="w-auto h-6" />
            <span>Uploading</span>
          </div>
        ) : hasPreError ? (
          <div className="flex items-center justify-center gap-2 text-error mx-auto">
            <AlertCircle className="w-4 h-4" />
            <span>Failed</span>
          </div>
        ) : task.task_status === "uploaded" ? (
          <button
            className="btn btn-secondary mx-auto font-thin btn-sm flex items-center gap-2"
            onClick={() => alignmentMutation.mutate(task.task_id)}
            disabled={alignmentMutation.isPending}
          >
            {alignmentMutation.isPending ? (
              <>
                <img
                  src="/spinner.gif"
                  alt="Starting..."
                  className="w-auto h-4"
                />
                <span>Starting...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Align</span>
              </>
            )}
          </button>
        ) : task.task_status === "aligned" ? (
          <div className="flex items-center gap-2 mx-auto">
            {countdown !== null && countdown > 0 ? (
              <>
                <span className="text-sm font-mono bg-primary/10 px-2 py-1 rounded">
                  {formatCountdown(countdown)}
                </span>
                <span>Aligning</span>
              </>
            ) : (
              <>
                <img
                  src="/spinner.gif"
                  alt="Aligning..."
                  className="w-auto h-6"
                />
                <span>Aligning</span>
              </>
            )}
          </div>
        ) : task.task_status === "completed" ? (
          <div className="flex items-center justify-center gap-2 text-primary mx-auto">
            <CheckCircle className="w-4 h-4" />
            <span>Completed</span>
          </div>
        ) : task.task_status === "failed" ? (
          <div className="flex items-center justify-center gap-2 text-error mx-auto">
            <XCircle className="w-4 h-4" />
            <span>Failed</span>
          </div>
        ) : (
          task.task_status.toUpperCase()
        )}
      </td>

      {/* Download column */}
      <td>
        {downloadUrl ? (
          <div className="tooltip" data-tip="Download files">
            <a href={downloadUrl} className="btn btn-ghost btn-xs" download>
              <Download className="w-4 h-4" />
            </a>
          </div>
        ) : hasPreError ? (
          <p className="text-center flex justify-around">
            <div className="tooltip" data-tip="No files available">
              <FileX className="w-4 h-4 text-error" />
            </div>
          </p>
        ) : isUploading ? (
          <img src="/spinner.gif" alt="Processing..." className="w-auto h-6" />
        ) : (
          <span className="text-gray-400">Not ready</span>
        )}
      </td>
    </tr>
  );
}
