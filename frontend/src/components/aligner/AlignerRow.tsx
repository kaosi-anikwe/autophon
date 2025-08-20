import { AxiosError } from "axios";
import axios from "axios";
import { useState, useEffect, useRef, memo } from "react";
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
  Upload,
  X,
} from "lucide-react";

import { api } from "@/lib/api";
import { taskReuploadAPI, taskCancellationAPI } from "@/lib/api";
import LanguageCell from "./LanguageCell";
import EngineCell from "./EngineCell";
import { useToast } from "@/contexts/ToastContext";
import { useConfig } from "@/contexts/AppConfigContext";
import ProgressBar from "../ui/ProgressBar";
import type { Task } from "@/types/api";

// Utility function to truncate filename with middle ellipsis
const truncateFilename = (filename: string, maxLength: number = 30): string => {
  if (filename.length <= maxLength) {
    return filename;
  }

  // Calculate how many characters to show on each side
  const ellipsis = "...";
  const sideLength = Math.floor((maxLength - ellipsis.length) / 2);

  // Extract file extension to always preserve it
  const lastDotIndex = filename.lastIndexOf(".");
  const hasExtension = lastDotIndex > 0 && lastDotIndex > filename.length - 6; // reasonable extension length

  if (hasExtension) {
    const baseName = filename.substring(0, lastDotIndex);
    const extension = filename.substring(lastDotIndex);

    // If the extension is too long, treat the whole thing as one string
    if (extension.length > maxLength / 3) {
      const start = filename.substring(0, sideLength);
      const end = filename.substring(filename.length - sideLength);
      return `${start}${ellipsis}${end}`;
    }

    // Calculate space available for basename after reserving space for extension
    const availableForBasename = maxLength - extension.length - ellipsis.length;
    const startLength = Math.ceil(availableForBasename * 0.6); // 60% for start
    const endLength = Math.floor(availableForBasename * 0.4); // 40% for end of basename

    if (baseName.length <= availableForBasename) {
      return filename;
    }

    const start = baseName.substring(0, startLength);
    const end = baseName.substring(baseName.length - endLength);
    return `${start}${ellipsis}${end}${extension}`;
  } else {
    // No extension, simple middle truncation
    const start = filename.substring(0, sideLength);
    const end = filename.substring(filename.length - sideLength);
    return `${start}${ellipsis}${end}`;
  }
};

type AligerRowProps = {
  task: Task;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  showDeleteButton?: boolean;
  onDelete?: () => void;
  homepage?: boolean;
};

const AlignerRow = memo(function AlignerRow({
  task,
  checked = false,
  onCheckedChange,
  showDeleteButton = false,
  onDelete,
  homepage = false,
}: AligerRowProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const config = useConfig();
  const [selectedLanguageName, setSelectedLanguageName] = useState<
    string | undefined
  >(task.language?.language_name);
  const [shouldOpenEngineDropdown, setShouldOpenEngineDropdown] =
    useState(false);

  // Countdown timer state
  const [countdown, setCountdown] = useState<number | null>(null);
  const [, setAlignmentStartTime] = useState<Date | null>(null);

  // Reupload state
  const [isReuploading, setIsReuploading] = useState(false);
  const [reuploadProgress, setReuploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelTokenRef = useRef<ReturnType<
    typeof axios.CancelToken.source
  > | null>(null);

  // Video state for processing tasks
  const videoRef = useRef<HTMLVideoElement>(null);

  // Citation modal state
  const [showCitationModal, setShowCitationModal] = useState(false);

  // Determine if task has errors
  const hasPreError = task.pre_error === true;
  const isUploading = task.task_status === "uploading" && !task.pre_error;

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

  // Handle video playback for processing/aligned tasks
  useEffect(() => {
    if (
      (task.task_status === "processing" || task.task_status === "aligned") &&
      videoRef.current &&
      task.language?.code
    ) {
      const video = videoRef.current;

      // Set random start time to avoid monotonous appearance (no speed manipulation)
      const handleLoadedMetadata = () => {
        if (video.duration && !isNaN(video.duration)) {
          const randomStartTime = Math.random() * video.duration;
          video.currentTime = randomStartTime;
        }
      };

      const handleCanPlayThrough = () => {
        // Only play when video is fully buffered to avoid choppy playback
        video.play().catch(console.error);
      };

      const handleStalled = () => {
        // Handle buffering issues
        console.warn("Video stalled, attempting to continue playback");
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("canplaythrough", handleCanPlayThrough);
      video.addEventListener("stalled", handleStalled);

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("canplaythrough", handleCanPlayThrough);
        video.removeEventListener("stalled", handleStalled);
      };
    }
  }, [task.task_status, task.language?.code]);

  // Determine if task should use double folder icon
  const shouldUseDoubleFolderIcon = (): boolean => {
    return (
      task.trans_choice === "exp-a" ||
      task.trans_choice === "comp-ling" ||
      task.batch === true // In case batch property exists but not in type
    );
  };

  // Check if file is an audio file
  const isAudioFile = (fileName: string): boolean => {
    if (!config) return false;
    const extension = fileName.split(".").pop()?.toLowerCase();
    return config.audioExtensions.includes(extension || "");
  };

  // Cancel reupload function
  const cancelReupload = () => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel("Reupload cancelled by user");
    }
  };

  // Handle file selection for reupload
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!isAudioFile(file.name)) {
      toast.error("Please select a valid audio file");
      return;
    }

    // Start reupload
    reuploadMutation.mutate(file);
  };

  // Reupload mutation
  const reuploadMutation = useMutation({
    mutationFn: async (audioFile: File) => {
      // Create cancel token for this reupload
      const cancelToken = axios.CancelToken.source();
      cancelTokenRef.current = cancelToken;

      setIsReuploading(true);
      setReuploadProgress(0);

      const response = await taskReuploadAPI.reuploadTask(
        task.task_id,
        audioFile,
        (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setReuploadProgress(progress);
          }
        },
        cancelToken.token
      );

      return response;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Audio file re-uploaded successfully!");

      // Clear reupload state
      setIsReuploading(false);
      setReuploadProgress(0);
      cancelTokenRef.current = null;

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Refetch tasks to update the status
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: AxiosError<{ message?: string }> | Error) => {
      console.error("Reupload failed:", error);

      // Check if error was due to cancellation
      if (axios.isCancel(error)) {
        toast.info("Reupload cancelled successfully");
      } else {
        const errorMessage =
          (error as AxiosError<{ message?: string }>).response?.data?.message ||
          "Failed to re-upload audio file";
        toast.error(errorMessage);
      }

      // Clear reupload state
      setIsReuploading(false);
      setReuploadProgress(0);
      cancelTokenRef.current = null;

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  });

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

  // Cancel alignment mutation
  const cancelAlignmentMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await taskCancellationAPI.cancelTask(taskId);
      return response;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Task alignment cancelled successfully");

      // Clear countdown timer
      setCountdown(null);
      setAlignmentStartTime(null);

      // Refetch tasks to update the status
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const errorMessage =
        error.response?.data?.message || "Failed to cancel alignment";
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

  // Handle download click - show citation modal for homepage users
  const handleDownloadClick = (e: React.MouseEvent) => {
    if (homepage && task.task_status === "completed") {
      e.preventDefault();
      setShowCitationModal(true);
    }
    // For non-homepage users, let the default download behavior proceed
  };

  // Generate citation download URL
  const getCitationDownloadUrl = () => {
    if (task.language?.code) {
      return `https://new.autophontest.se/api/v1/static/cite/${task.language.code}_cite.txt`;
    }
    return null;
  };

  const getMissingUrl = () => {
    if (task.missing_words) {
      return `https://new.autophontest.se/api/v1/tasks/${task.task_id}/download/missing_dict`;
    }
    return null;
  };

  const downloadUrl = getDownloadUrl();
  const missingUrl = getMissingUrl();

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
      return (
        <img
          src="/spinner.gif"
          alt="Loading..."
          className="w-auto h-6 mx-auto"
        />
      );
    }
    if (field === "missing_words") {
      return missingUrl ? (
        <div className="tooltip tooltip-left">
          <div
            className="tooltip-content text-xs bg-base-300 font-cascadia whitespace-nowrap text-left max-w-fit rounded w-[50rem] z-[50]"
            dangerouslySetInnerHTML={{ __html: task.missingpronhtml! }}
          />
          {value}
          <a href={getMissingUrl()!} className="btn btn-ghost btn-xs" download>
            <Download className="w-4 h-4 mb-2" />
          </a>
        </div>
      ) : (
        value
      );
    }
    return value || "N/A";
  };

  return (
    <>
      {/* Delete button column */}
      <div className="p-2 flex items-center justify-center">
        {showDeleteButton && (
          <div className="tooltip tooltip-right" data-tip="Delete this task">
            <Trash2
              className="w-4 h-4 cursor-pointer text-error hover:text-error/80"
              onClick={onDelete}
            />
          </div>
        )}
      </div>

      {/* Checkbox column */}
      <div className="p-2 flex items-center justify-center">
        <label>
          <input
            type="checkbox"
            className="checkbox checkbox-xs"
            checked={checked}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
          />
        </label>
      </div>

      {/* File name */}
      <div className="p-2 flex items-center">
        <div className="flex items-start gap-2 w-full">
          {shouldUseDoubleFolderIcon() ? (
            <Folders className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="tooltip tooltip-bottom text-left">
              <div className="tooltip-content text-right max-w-fit">
                {task.download_title}
              </div>
              <span className="font-cascadia font-medium text-left block truncate">
                {truncateFilename(task.download_title || "", 28)}
              </span>
            </div>
            <span className="font-cascadia text-xs text-left text-base-content/60">
              {task.download_date}
            </span>
          </div>
        </div>
      </div>

      {/* Language dropdown */}
      {task.task_status === "processing" || task.task_status === "aligned" ? (
        // For processing/aligned tasks, this column is merged with others for the video
        <></>
      ) : (
        <div className={"p-2 flex items-center justify-center"}>
          <LanguageCell
            key={task.task_status}
            task={task}
            onLanguageSelected={(languageName) => {
              setSelectedLanguageName(languageName);
              setShouldOpenEngineDropdown(true);
            }}
          />
        </div>
      )}

      {/* Engine dropdown */}
      {task.task_status === "processing" || task.task_status === "aligned" ? (
        // For processing/aligned tasks, this column is merged with others for the video
        <></>
      ) : (
        <div className={"p-2 flex items-center justify-center"}>
          <EngineCell
            key={`${task.task_id}-${selectedLanguageName || "no-language"}`}
            task={task}
            selectedLanguageName={selectedLanguageName}
            shouldOpen={shouldOpenEngineDropdown}
            onDropdownOpened={() => setShouldOpenEngineDropdown(false)}
          />
        </div>
      )}

      {/* Tiers */}
      {task.task_status === "processing" || task.task_status === "aligned" ? (
        // For processing/aligned tasks, this column is merged with others for the video
        <></>
      ) : (
        <div className={"p-2 flex items-center justify-center text-center"}>
          {renderCellContent(task.no_of_tiers, "no_of_tiers")}
        </div>
      )}

      {/* Size MB */}
      {task.task_status === "processing" || task.task_status === "aligned" ? (
        // For processing/aligned tasks, this column is merged with others for the video
        <></>
      ) : (
        <div className={"p-2 flex items-center justify-center text-center"}>
          {task.size ? `${task.size}` : "N/A"}
        </div>
      )}

      {/* Words */}
      {task.task_status === "processing" || task.task_status === "aligned" ? (
        // For processing/aligned tasks, this column is merged with others for the video
        <></>
      ) : (
        <div className={"p-2 flex items-center justify-center text-center"}>
          {renderCellContent(task.words, "words")}
        </div>
      )}

      {/* Missing Words */}
      {task.task_status === "processing" || task.task_status === "aligned" ? (
        // For processing/aligned tasks, this column is merged with others for the video
        <></>
      ) : task.task_status === "expired" && isReuploading ? (
        // For expired tasks during upload, this column is merged with status column
        <></>
      ) : (
        <div className="p-2 flex items-center justify-center text-center">
          {renderCellContent(task.missing_words, "missing_words")}
        </div>
      )}

      {/* Status */}
      <div
        className={`${
          task.task_status === "processing" || task.task_status === "aligned"
            ? "col-span-7 p-0"
            : task.task_status === "expired" && isReuploading
            ? "col-span-2 p-2"
            : "p-2"
        } flex items-center justify-center text-center`}
      >
        {isUploading ? (
          <div className="flex items-center gap-2">
            <img src="/spinner.gif" alt="Uploading..." className="w-auto h-6" />
            <span>Uploading</span>
          </div>
        ) : hasPreError ? (
          <div className="flex items-center justify-center gap-2 text-error">
            <AlertCircle className="w-4 h-4" />
            <span>Failed</span>
          </div>
        ) : task.task_status === "uploaded" ? (
          <button
            className="btn btn-neutral font-thin btn-sm flex items-center gap-2"
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
        ) : task.task_status === "aligned" ||
          task.task_status === "processing" ? (
          <div className="w-full h-full relative overflow-hidden">
            {task.language?.code ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                preload="auto"
                style={{
                  display: "block",
                  margin: 0,
                  padding: 0,
                  verticalAlign: "top",
                  willChange: "auto",
                  backfaceVisibility: "hidden",
                  transform: "translate3d(0, 0, 0)",
                  WebkitTransform: "translate3d(0, 0, 0)",
                  WebkitBackfaceVisibility: "hidden",
                }}
              >
                <source
                  src={`/langs/${task.language.code}/${task.language.code}.mp4`}
                  type="video/mp4"
                />
                {/* Fallback content */}
                <div className="flex items-center justify-center gap-2 h-full">
                  <img
                    src="/spinner.gif"
                    alt="Processing..."
                    className="w-auto h-6"
                  />
                  <span>Processing</span>
                </div>
              </video>
            ) : (
              <div className="flex items-center justify-center gap-2 h-full">
                <img
                  src="/spinner.gif"
                  alt="Processing..."
                  className="w-auto h-6"
                />
                <span>Processing</span>
              </div>
            )}
          </div>
        ) : task.task_status === "completed" ? (
          <div className="flex items-center justify-center gap-2 text-primary">
            <CheckCircle className="w-4 h-4" />
            <span>Completed</span>
          </div>
        ) : task.task_status === "failed" ? (
          <div className="flex items-center justify-center gap-2 text-error">
            <XCircle className="w-4 h-4" />
            <span>Failed</span>
          </div>
        ) : task.task_status === "expired" ? (
          <div className={`w-full ${isReuploading ? "px-2" : ""}`}>
            {isReuploading ? (
              // Reupload in progress - expanded layout using 2 columns
              <div className="bg-base-200/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src="/spinner.gif"
                      alt="Uploading..."
                      className="w-auto h-4"
                    />
                    <span className="text-sm font-medium">
                      Uploading audio...
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <ProgressBar title="" progress={reuploadProgress} />

                  {/* Cancel button */}
                  {cancelTokenRef.current && (
                    <button
                      type="button"
                      className="btn btn-error btn-xs w-full"
                      onClick={cancelReupload}
                    >
                      Cancel Upload
                    </button>
                  )}
                </div>
              </div>
            ) : (
              // Add Audio button - single column layout
              <div className="flex items-center justify-center">
                <button
                  className="btn btn-accent btn-sm font-thin flex items-center gap-1 whitespace-nowrap text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isReuploading}
                >
                  <Upload className="w-3 h-3" />
                  <span>Add Audio</span>
                </button>
              </div>
            )}

            {/* Hidden file input for audio files only */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={config?.audioExtensions
                ?.map((ext) => `.${ext}`)
                .join(",")}
              onChange={handleFileSelect}
              disabled={isReuploading}
            />
          </div>
        ) : (
          task.task_status.toUpperCase()
        )}
      </div>

      {/* Download column */}
      <div className={"p-2 flex items-center justify-center"}>
        {task.task_status === "processing" || task.task_status === "aligned" ? (
          // Cancel alignment button for processing/aligned tasks
          <div className="tooltip tooltip-left" data-tip="Cancel alignment">
            <button
              className="btn btn-ghost btn-xs text-error hover:bg-error/10"
              onClick={() => cancelAlignmentMutation.mutate(task.task_id)}
              disabled={cancelAlignmentMutation.isPending}
            >
              {cancelAlignmentMutation.isPending ? (
                <img
                  src="/spinner.gif"
                  alt="Cancelling..."
                  className="w-auto h-4"
                />
              ) : (
                <X className="w-4 h-4" />
              )}
            </button>
          </div>
        ) : downloadUrl ? (
          <div className="tooltip tooltip-left" data-tip="Download files">
            <a
              href={downloadUrl}
              className="btn btn-ghost btn-xs"
              download
              onClick={handleDownloadClick}
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        ) : hasPreError ? (
          <div className="text-center flex justify-around">
            <div className="tooltip tooltip-left" data-tip="No files available">
              <FileX className="w-4 h-4 text-error" />
            </div>
          </div>
        ) : isUploading ? (
          <img
            src="/spinner.gif"
            alt="Processing..."
            className="w-auto h-6 mx-auto"
          />
        ) : (
          <span className="text-gray-400">Not ready</span>
        )}
      </div>

      {/* Citation Modal */}
      {showCitationModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">Citation Requirements</h3>

            <div className="mb-6">
              <p className="text-sm font-medium mb-4">
                I confirm that any of my research outputs that have used
                Autophon will cite the following sources:
              </p>

              {/* Citation content from task.cite or default content */}
              <div className="bg-base-200 p-4 rounded-lg text-sm space-y-3 leading-relaxed">
                {task.cite ? (
                  <div dangerouslySetInnerHTML={{ __html: task.cite }} />
                ) : (
                  <>
                    <p>
                      Boersma, P., & Weenink, D. (2017). Praat: Doing phonetics
                      by computer [Computer software], Version 6.0.36.
                      http://www.praat.org/
                    </p>
                    <p>
                      McAuliffe, M., Socolof, M., Mihuc, S., Wagner, M., &
                      Sonderegger, M. (2017). Montreal Forced Aligner: Trainable
                      text-speech alignment using Kaldi. Proceedings of
                      Interspeech, 498–502.
                    </p>
                    <p>
                      Young, N. J. (2020). NoFA 1.0 – norsk modell for forced
                      alignment, version 1.0. https://www.nb.no/
                      sprakbanken/ressurskatalog/oai-nb-no-sbr-59/
                    </p>
                    <p>
                      Young, N. J., & Anikwe, K. (2024). Autophon – Automatic
                      phonetic annotation of Nordic languages (web application).
                      www.autophon.se
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="modal-action justify-between">
              {getCitationDownloadUrl() && (
                <a
                  href={getCitationDownloadUrl()!}
                  className="underline"
                  download
                >
                  Click to download citation list
                </a>
              )}

              <div className="space-x-2">
                <button
                  type="button"
                  className="btn btn-ghost font-thin"
                  onClick={() => setShowCitationModal(false)}
                >
                  Cancel
                </button>
                <a
                  href={downloadUrl!}
                  className="btn btn-primary font-thin"
                  download
                  onClick={() => setShowCitationModal(false)}
                >
                  Agree & Download Files
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default AlignerRow;
