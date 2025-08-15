import { CirclePlus } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import TranscriptionSelect from "../modals/TranscriptionSelect";
import TransChoices from "./TransChoices";
import FileValidator from "../features/FileValidator";
import { useToast } from "@/contexts/ToastContext";
import { useConfig } from "@/contexts/AppConfigContext";
import { AxiosError } from "axios";
import { type Task } from "@/types/api";
import ProgressBar from "../ui/ProgressBar";
import AlignerTable from "./AlignerTable";
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
  type: "closed" | "selectingFile" | "selectingTransChoice";
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
  const [fileList, setFileList] = useState<FileList | null>(null);
  const toast = useToast();
  const config = useConfig();

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({
      files,
      transChoice,
    }: {
      files: FileList;
      transChoice: string;
    }) => {
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
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setModalState((prev) => ({ ...prev, uploadProgress: progress }));

            // Start preprocessing progress when upload is complete
            if (progress === 100) {
              setModalState((prev) => ({ ...prev, isPreprocessing: true }));

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
    onError: (error: AxiosError<TaskUploadError>) => {
      console.error("Upload failed:", error);
      const data = error.response?.data;
      toast.error(
        data ? data.message : "",
        "File upload failed. Please try again."
      );
      toast.error("Please ensure the correct transciption mode was selected.");

      // Reset uploading state but keep modal open
      setModalState((prev) => ({
        ...prev,
        uploading: false,
        uploadProgress: 0,
        preprocessingProgress: 0,
        isPreprocessing: false,
      }));
    },
  });

  // Fetch tasks query with real-time updates for uploading tasks
  const fetchTasks = useQuery<Task[]>({
    queryKey: ["tasks"],
    staleTime: 2 * 1000, // 2 seconds for real-time feel
    refetchInterval: ({ state }) => {
      // Check if any tasks are in uploading state
      if (!state?.data || !Array.isArray(state.data)) {
        return 30000; // Default polling if no data or error
      }
      const hasUploadingTasks = state.data.some(
        (task) => task.task_status === "uploading"
      );
      return hasUploadingTasks ? 3000 : 30000; // Poll every 3s if uploading, else every 30s
    },
    queryFn: async () => {
      const response = await api.get("/tasks");
      return response.data.tasks;
    },
  });

  // Prefetch languages data 
  const { data: languagesData } = useQuery({
    queryKey: ["languages"],
    queryFn: async () => {
      const response = await api.get("/languages");
      return response.data.languages;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Prefetch engines data
  const { data: enginesData } = useQuery({
    queryKey: ["engines"],
    queryFn: async () => {
      const response = await api.get("/engines");
      return response.data.engines;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle validated files from FileValidator
  const handleFilesValidated = (files: FileList) => {
    setFileList(files);

    // Start upload immediately after validation
    if (!transChoice) {
      toast.error("Please select a transcription mode first");
      return;
    }

    setModalState((prev) => ({ ...prev, uploading: true }));
    uploadMutation.mutate({ files, transChoice });
  };

  const openModal = modalState.type !== "closed";

  let modalContent = <></>;
  const size = modalState.type === "selectingFile" ? "sm" : "xl";
  const onModalClose = !modalState.uploading
    ? () =>
        setModalState({
          type: "closed",
          uploading: false,
          uploadProgress: 0,
          preprocessingProgress: 0,
          isPreprocessing: false,
        })
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
                progress={modalState.preprocessingProgress}
                type="secondary"
              />
            )}

            <p className="text-xs text-base-300">
              Please do not close this window during upload.
            </p>
          </div>
        )}

        <p className="text-xs leading-[1.5] text-base-300 text-left py-1">
          A single upload may be no larger than{" "}
          {config?.user_limits?.size_limit || 750} MB. If your zip folder
          contains hundreds or thousands of small files, the progress bar will
          park itself at 100% for as long as 30 minutes. Do not refresh; rather,
          wait it out, and it will eventually load. We are currently working on
          a patch to fix this. If you need help, select change transcription
          mode for video guides.
        </p>
        {!modalState.uploading && (
          <button
            type="button"
            className="btn btn-primary font-thin text-left mt-2"
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

  let titleClasses = "text-2xl font-bold flex items-center";
  if (homepage) titleClasses += " py-8";

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
                onClick={() =>
                  setModalState((prev) => ({
                    ...prev,
                    type: "selectingFile",
                    uploading: false,
                  }))
                }
              >
                <span className="text-2xl mr-2">
                  <CirclePlus className="w-6 h-6 text-base-100 fill-accent" />
                </span>
                {title}
                {homepage ? "*" : ""}
              </h4>
            </button>
          </div>

          <AlignerTable tasks={fetchTasks.data} isLoading={fetchTasks.isLoading} />
        </div>
      </div>
    </>
  );
}
