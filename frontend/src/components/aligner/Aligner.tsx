import { useState, useRef } from "react";
import { AxiosError } from "axios";
import axios from "axios";
import TransChoices from "./TransChoices";
import { CirclePlus } from "lucide-react";
import ProgressBar from "../ui/ProgressBar";
import FileValidator from "../features/FileValidator";
import Captcha from "../features/Captcha";
import { useMutation, useQuery } from "@tanstack/react-query";
import TranscriptionSelect from "../modals/TranscriptionSelect";

import { api } from "@/lib/api";
import { type Task } from "@/types/api";
import AlignerTable from "./AlignerTable";
import { useToast } from "@/contexts/ToastContext";
import { useConfig } from "@/contexts/AppConfigContext";
import { useAppSelector } from "@/hooks/useAppDispatch";

type TaskUploadError = {
  success: boolean;
  message: string;
};

type AlignerProps = {
  title: string;
  homepage?: boolean;
};

type ModalState = {
  type: "closed" | "selectingFile" | "selectingTransChoice" | "captcha";
  uploading: boolean;
  uploadProgress: number;
  preprocessingProgress: number;
  isPreprocessing: boolean;
};

type TransMap = {
  [key: string]: string;
  "exp-a": string;
  "exp-b": string;
  "comp-ling": string;
  "var-ling": string;
};

const transMap: TransMap = {
  "exp-a": "Experimental Ling A",
  "exp-b": "Experimental Ling B",
  "comp-ling": "Computational Ling",
  "var-ling": "Variationist Ling",
};

const reverseTransMap = {
  "Experimental Ling A": "exp-a",
  "Experimental Ling B": "exp-b",
  "Computational Ling": "comp-ling",
  "Variationist Ling": "var-ling",
};

const preProcessTime = (fileSize: number) => {
  // Coefficients for the quadratic equation
  const a = 0.0154;
  const b = -0.9468;
  const c = 1.6455;
  // Calculate the estimated processing time
  let estimatedTime = a * Math.pow(fileSize, 2) + b * fileSize + c;
  estimatedTime = Math.max(estimatedTime, 0.5);
  return estimatedTime;
};

export default function Aligner({ title, homepage }: AlignerProps) {
  const { user } = useAppSelector((state) => state.auth);
  const [modalState, setModalState] = useState<ModalState>({
    type: "closed",
    uploading: false,
    uploadProgress: 0,
    preprocessingProgress: 0,
    isPreprocessing: false,
  });
  const [transChoice, setTransChoice] = useState<string | null>(
    user?.trans_default ? transMap[user.trans_default] : null
  ); // to be populated with user data
  const [, setFileList] = useState<FileList | null>(null);
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null); // Files waiting for captcha
  const cancelTokenRef = useRef<ReturnType<
    typeof axios.CancelToken.source
  > | null>(null);
  const toast = useToast();
  const config = useConfig();

  let sizeLimit = 750000;
  if (config) {
    sizeLimit = homepage
      ? config.userLimits.a_size_limit
      : config.userLimits.size_limit;
  }

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({
      files,
      transChoice,
    }: {
      files: FileList;
      transChoice: string;
    }) => {
      // Create cancel token for this upload
      const cancelToken = axios.CancelToken.source();
      cancelTokenRef.current = cancelToken;

      const formData = new FormData();

      // Add files to FormData
      Array.from(files).forEach((file) => {
        formData.append("files[]", file);
      });

      // Add trans-choice using reverse mapping
      const transChoiceKey =
        reverseTransMap[transChoice as keyof typeof reverseTransMap];
      if (transChoiceKey) {
        formData.append("trans_choice", transChoiceKey);
      }

      // Calculate total file size for preprocessing time estimation
      const totalSize = Array.from(files).reduce(
        (acc, file) => acc + file.size,
        0
      );
      const totalSizeMB = totalSize / (1024 * 1024);
      const estimatedPreprocessTime = preProcessTime(totalSizeMB);

      const response = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 10 * 60 * 1000, // 10 minutes timeout for file uploads
        cancelToken: cancelToken.token,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setModalState((prev) => ({ ...prev, uploadProgress: progress }));

            // Start preprocessing progress when upload is complete
            if (progress === 100) {
              setModalState((prev) => ({ ...prev, isPreprocessing: true }));
              // Clear cancel token once upload is complete
              cancelTokenRef.current = null;

              // Simulate preprocessing progress
              let preprocessProgress = 0;
              const progressInterval = setInterval(() => {
                preprocessProgress += 100 / (estimatedPreprocessTime * 10); // Update every 100ms
                setModalState((prev) => ({
                  ...prev,
                  preprocessingProgress: Math.min(preprocessProgress, 100),
                }));

                if (preprocessProgress >= 100) {
                  clearInterval(progressInterval);
                }
              }, 100);
            }
          }
        },
      });

      return response.data;
    },
    onSuccess: () => {
      toast.success("Files uploaded successfully!");

      // Clear cancel token
      cancelTokenRef.current = null;

      // Fetch user tasks after successful upload
      fetchTasks.refetch();

      // Reset modal state
      setModalState({
        type: "closed",
        uploading: false,
        uploadProgress: 0,
        preprocessingProgress: 0,
        isPreprocessing: false,
      });
      setFileList(null);
    },
    onError: (error: AxiosError<TaskUploadError> | Error) => {
      console.error("Upload failed:", error);

      // Check if error was due to cancellation
      if (axios.isCancel(error)) {
        toast.info("Upload cancelled successfully");
      } else {
        const data = (error as AxiosError<TaskUploadError>).response?.data;
        toast.error(
          data ? data.message : "",
          "File upload failed. Please try again."
        );
        toast.error(
          "Please ensure the correct transciption mode was selected."
        );
      }

      // Clear cancel token and reset uploading state
      cancelTokenRef.current = null;
      setModalState((prev) => ({
        ...prev,
        uploading: false,
        uploadProgress: 0,
        preprocessingProgress: 0,
        isPreprocessing: false,
      }));
    },
  });

  // Helper function to check if user_id cookie exists (for anonymous uploads)
  const hasUserIdCookie = () => {
    return document.cookie
      .split(";")
      .some((cookie) => cookie.trim().startsWith("user_id="));
  };

  // Only fetch tasks if user is authenticated OR has user_id cookie (anonymous upload)
  const shouldFetchTasks = user?.uuid !== undefined || hasUserIdCookie();

  // Fetch tasks query with real-time updates for uploading and aligning tasks
  const fetchTasks = useQuery<Task[]>({
    queryKey: ["tasks", user?.uuid],
    staleTime: 2 * 1000, // 2 seconds for real-time feel
    enabled: shouldFetchTasks, // Only fetch when user is authenticated or has user_id cookie
    refetchInterval: ({ state }) => {
      // Check if any tasks are in uploading or aligned state
      if (!state?.data || !Array.isArray(state.data)) {
        return 30000; // Default polling if no data or error
      }
      const hasActiveProcessingTasks = state.data.some(
        (task) =>
          task.task_status === "uploading" || task.task_status === "aligned"
      );
      return hasActiveProcessingTasks ? 3000 : 30000; // Poll every 3s if processing, else every 30s
    },
    queryFn: async () => {
      const response = await api.get("/tasks");
      return response.data.tasks;
    },
  });

  // Prefetch languages data
  useQuery({
    queryKey: ["languages"],
    queryFn: async () => {
      const response = await api.get("/public/languages");
      return response.data.languages;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Prefetch engines data
  useQuery({
    queryKey: ["engines"],
    queryFn: async () => {
      const response = await api.get("/engines");
      return response.data.engines;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Cancel upload function
  const cancelUpload = () => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel("Upload cancelled by user");
    }
  };

  // Handle captcha verification
  const handleCaptchaVerified = (verified: boolean) => {
    if (verified && pendingFiles && transChoice) {
      // Captcha passed, proceed with upload
      setModalState((prev) => ({ ...prev, uploading: true }));
      uploadMutation.mutate({ files: pendingFiles, transChoice });
      setPendingFiles(null);
    } else {
      // Captcha failed, stay on captcha screen for retry
      toast.error("Captcha verification failed. Please try again.");
    }
  };

  // Handle validated files from FileValidator
  const handleFilesValidated = (files: FileList) => {
    setFileList(files);

    // Start upload immediately after validation
    if (!transChoice) {
      toast.error("Please select a transcription mode first");
      return;
    }

    // For homepage users, show captcha before upload
    if (homepage) {
      setPendingFiles(files);
      setModalState((prev) => ({ ...prev, type: "captcha" }));
      return;
    }

    // For authenticated users, upload immediately
    setModalState((prev) => ({ ...prev, uploading: true }));
    uploadMutation.mutate({ files, transChoice });
  };

  const openModal = modalState.type !== "closed";

  let modalContent = <></>;
  const size =
    modalState.type === "selectingFile" || modalState.type === "captcha"
      ? "sm"
      : "xl";
  const onModalClose = !modalState.uploading
    ? () => {
        setModalState({
          type: "closed",
          uploading: false,
          uploadProgress: 0,
          preprocessingProgress: 0,
          isPreprocessing: false,
        });
        setPendingFiles(null); // Clear pending files on modal close
      }
    : () => {};

  if (modalState.type === "selectingFile") {
    modalContent = (
      <>
        <div className="card border border-base-200 p-4 w-60 mx-auto my-2">
          <p className="uppercase text-center">
            Transcription Mode: {transChoice}
          </p>
          <button
            type="button"
            className="btn btn-accent font-thin"
            onClick={() =>
              setModalState({
                type: "selectingTransChoice",
                uploading: false,
                uploadProgress: 0,
                preprocessingProgress: 0,
                isPreprocessing: false,
              })
            }
          >
            change transcription mode
          </button>
        </div>
        <FileValidator
          onFilesValidated={handleFilesValidated}
          isUploading={modalState.uploading}
          homepage={homepage}
        />

        {/* Upload Progress */}
        {modalState.uploading && (
          <div className="mt-4">
            {/* File Upload Progress */}
            <ProgressBar
              title="Uploading files..."
              progress={modalState.uploadProgress}
            />

            {/* Preprocessing Progress */}
            {modalState.isPreprocessing && (
              <ProgressBar
                title="Processing files..."
                progress={parseInt(modalState.preprocessingProgress.toFixed(0))}
                type="secondary"
              />
            )}

            <div className="flex justify-between items-center mt-3">
              <p className="text-xs text-base-300">
                {modalState.isPreprocessing
                  ? "Files are being processed on the server. This cannot be cancelled."
                  : "Please do not close this window during upload."}
              </p>

              {/* Cancel button - only show if upload hasn't completed */}
              {!modalState.isPreprocessing && cancelTokenRef.current && (
                <button
                  type="button"
                  className="btn btn-error btn-sm font-thin"
                  onClick={cancelUpload}
                >
                  Cancel Upload
                </button>
              )}
            </div>
          </div>
        )}

        <p className="text-xs leading-[1.5] text-base-content/50 text-left py-1">
          A single upload may be no larger than {sizeLimit / 1000 || 750} MB. If
          your zip folder contains hundreds or thousands of small files, the
          progress bar will park itself at 100% for as long as 30 minutes. Do
          not refresh; rather, wait it out, and it will eventually load. We are
          currently working on a patch to fix this. If you need help, select
          change transcription mode for video guides.
        </p>
        {!modalState.uploading && (
          <button
            type="button"
            className="btn btn-neutral font-thin text-left mt-2"
            onClick={() => {
              setModalState({
                type: "closed",
                uploading: false,
                uploadProgress: 0,
                preprocessingProgress: 0,
                isPreprocessing: false,
              });
              setFileList(null);
            }}
          >
            Cancel upload
          </button>
        )}
      </>
    );
  }
  if (modalState.type === "selectingTransChoice") {
    const handleContinue = () =>
      setModalState((prev) => ({
        ...prev,
        type: "selectingFile",
        uploading: false,
      }));
    modalContent = (
      <TransChoices
        activeTitle={transChoice}
        onContinue={handleContinue}
        onSelectionChange={(title) => setTransChoice(title)}
      />
    );
  }
  if (modalState.type === "captcha") {
    modalContent = (
      <div className="w-full max-w-md mx-auto p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold mb-4">Captcha Safeguard</h3>
          <p className="text-sm text-base-content/70 leading-relaxed">
            Due to bot attacks, we have added this captcha function. To bypass
            the captcha and gain access to advanced features, we recommend you
            create a free account. Note that sevens and ones often look the
            same.
          </p>
        </div>

        <div className="flex justify-around">
          <Captcha onVerify={handleCaptchaVerified} isVisible={true} />
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className="btn btn-neutral font-thin"
            onClick={() => {
              setModalState({
                type: "closed",
                uploading: false,
                uploadProgress: 0,
                preprocessingProgress: 0,
                isPreprocessing: false,
              });
              setPendingFiles(null);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  let titleClasses = "text-2xl font-bold flex items-center";
  if (!homepage) titleClasses += " py-8";

  return (
    <>
      <TranscriptionSelect
        size={size}
        isOpen={openModal}
        onClose={onModalClose}
        closeOnBackdropClick={!modalState.uploading}
      >
        {modalContent}
      </TranscriptionSelect>

      <div className="card shadow-lg border-0 bg-base-100 pb-5">
        <div className="p-6">
          <div className="w-full flex justify-center">
            <button
              className="text-accent bg-transparent border-0 p-0 cursor-pointer"
              type="button"
            >
              <h4
                className={titleClasses}
                onClick={() => {
                  // Check if user has trans_default, if not show trans choice selection first
                  if (!user?.trans_default) {
                    setModalState((prev) => ({
                      ...prev,
                      type: "selectingTransChoice",
                      uploading: false,
                    }));
                  } else {
                    setModalState((prev) => ({
                      ...prev,
                      type: "selectingFile",
                      uploading: false,
                    }));
                  }
                }}
              >
                <span className="text-2xl mr-2">
                  <CirclePlus className="w-6 h-6 text-base-100 fill-accent" />
                </span>
                {`${title}${homepage ? "*" : ""}`}
              </h4>
            </button>
          </div>

          <AlignerTable
            tasks={fetchTasks.data}
            homepage={homepage}
            isLoading={fetchTasks.isLoading}
          />
        </div>
      </div>
    </>
  );
}
