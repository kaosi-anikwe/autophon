import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Upload,
  Trash2,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  adminLanguagesAPI,
  computeLanguageCompletion,
  type AdminLanguage,
} from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { AxiosError } from "axios";

interface FileManagementModalProps {
  isOpen: boolean;
  language: AdminLanguage;
  onClose: () => void;
  onSuccess: () => void;
}

const FILE_TYPE_INFO = {
  cite: { label: "Citation File", extension: ".txt", accept: ".txt" },
  cleanup: { label: "Cleanup File", extension: ".txt", accept: ".txt" },
  complex2simple: {
    label: "Complex to Simple",
    extension: ".json",
    accept: ".json",
  },
  g2p_model: { label: "G2P Model", extension: ".zip", accept: ".zip" },
  ipa: { label: "IPA Mapping", extension: ".json", accept: ".json" },
  meta: { label: "Metadata", extension: ".yaml", accept: ".yaml,.yml" },
  simple_dict: {
    label: "Simple Dictionary",
    extension: ".dict",
    accept: ".dict",
  },
  normal_dict: {
    label: "Normal Dictionary",
    extension: ".dict",
    accept: ".dict",
  },
  dict_json: { label: "Dictionary JSON", extension: ".json", accept: ".json" },
  guide_pdf: { label: "User Guide", extension: ".pdf", accept: ".pdf" },
  model_zip: { label: "Language Model", extension: ".zip", accept: ".zip" },
};

export default function FileManagementModal({
  isOpen,
  language,
  onClose,
  onSuccess,
}: FileManagementModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );
  const toast = useToast();
  const queryClient = useQueryClient();

  const uploadFileMutation = useMutation({
    mutationFn: ({ fileType, file }: { fileType: string; file: File }) =>
      adminLanguagesAPI.uploadLanguageFile(
        language.id,
        fileType,
        file,
        (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress((prev) => ({ ...prev, [fileType]: progress }));
        }
      ),
    onSuccess: (data, variables) => {
      toast.success(data.message, "File Uploaded");
      setUploadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(variables.fileType);
        return newSet;
      });
      setSelectedFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[variables.fileType];
        return newFiles;
      });
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[variables.fileType];
        return newProgress;
      });
      onSuccess();
      queryClient.invalidateQueries({ queryKey: ["adminLanguages"] });
    },
    onError: (error: unknown, variables) => {
      if (error instanceof AxiosError) {
        toast.error(
          error.response?.data?.message || "Failed to upload file",
          "Upload Failed"
        );
      } else {
        toast.error(error as string, "Upload Failed");
      }
      setUploadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(variables.fileType);
        return newSet;
      });
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[variables.fileType];
        return newProgress;
      });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: ({ fileType, backup }: { fileType: string; backup: boolean }) =>
      adminLanguagesAPI.deleteLanguageFile(language.id, fileType, backup),
    onSuccess: (data) => {
      toast.success(data.message, "File Deleted");
      onSuccess();
      queryClient.invalidateQueries({ queryKey: ["adminLanguages"] });
    },
    onError: (error: unknown) => {
      if (error instanceof AxiosError) {
        toast.error(
          error.response?.data?.message || "Failed to delete file",
          "Delete Failed"
        );
      } else {
        toast.error(error as string, "Delete Failed");
      }
    },
  });

  const handleFileSelect = (fileType: string, file: File | null) => {
    if (file) {
      setSelectedFiles((prev) => ({ ...prev, [fileType]: file }));
    } else {
      setSelectedFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[fileType];
        return newFiles;
      });
    }
  };

  const handleUpload = (fileType: string) => {
    const file = selectedFiles[fileType];
    if (!file) return;

    setUploadingFiles((prev) => new Set(prev).add(fileType));
    uploadFileMutation.mutate({ fileType, file });
  };

  const handleDelete = (fileType: string) => {
    const backup = window.confirm(
      "Do you want to create a backup before deleting? Click OK for backup, Cancel to delete without backup."
    );

    if (
      window.confirm(
        `Are you sure you want to delete the ${
          FILE_TYPE_INFO[fileType as keyof typeof FILE_TYPE_INFO]?.label
        } file? ${
          backup ? "A backup will be created." : "No backup will be created."
        }`
      )
    ) {
      deleteFileMutation.mutate({ fileType, backup });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  // Ensure the language has computed completion properties
  const computedLanguage = computeLanguageCompletion(language);

  const availableFiles = Object.entries(
    computedLanguage.file_info || {}
  ).filter(([, info]) => info.exists);
  const missingFiles = computedLanguage.missing_files || [];

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold">Manage Language Files</h3>
            <p className="text-base-content/70">
              {computedLanguage.display_name} ({computedLanguage.code})
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Status Summary */}
        <div className="card bg-base-100 border border-base-200 mb-6">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold mb-2">
                  File Status Overview
                </h4>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-sm">
                      {availableFiles.length} files available
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="w-4 h-4 text-warning" />
                    <span className="text-sm">
                      {missingFiles.length} files missing
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {computedLanguage.is_complete ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-success" />
                    <span className="text-success font-medium">Complete</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-6 h-6 text-warning" />
                    <span className="text-warning font-medium">Incomplete</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* File Management Grid */}
        <div className="space-y-6">
          {Object.entries(FILE_TYPE_INFO).map(([fileType, info]) => {
            const fileInfo = language.file_info?.[fileType];
            const exists = fileInfo?.exists || false;
            const selectedFile = selectedFiles[fileType];
            const isUploading = uploadingFiles.has(fileType);
            const isDeleting = deleteFileMutation.isPending;

            return (
              <div
                key={fileType}
                className={`card border ${
                  exists
                    ? "border-success/30 bg-success/5"
                    : "border-warning/30 bg-warning/5"
                }`}
              >
                <div className="card-body p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          exists ? "bg-success/20" : "bg-warning/20"
                        }`}
                      >
                        <FileText
                          className={`w-5 h-5 ${
                            exists ? "text-success" : "text-warning"
                          }`}
                        />
                      </div>
                      <div>
                        <h5 className="font-semibold">{info.label}</h5>
                        <p className="text-sm text-base-content/60">
                          Expected:{" "}
                          {`${computedLanguage.code}_${fileType}${info.extension}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {exists ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <XCircle className="w-5 h-5 text-warning" />
                      )}
                    </div>
                  </div>

                  {/* File Information */}
                  {exists && fileInfo && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-3 bg-base-100 rounded-lg">
                      <div>
                        <span className="text-xs text-base-content/60">
                          Size
                        </span>
                        <div className="font-medium">
                          {formatFileSize(fileInfo.size)}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-base-content/60">
                          Modified
                        </span>
                        <div className="font-medium">
                          {formatDate(fileInfo.modified)}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-base-content/60">
                          Status
                        </span>
                        <div className="font-medium text-success">
                          Available
                        </div>
                      </div>
                    </div>
                  )}

                  {/* File Upload/Replace */}
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept={info.accept}
                        onChange={(e) =>
                          handleFileSelect(
                            fileType,
                            e.target.files?.[0] || null
                          )
                        }
                        className="file-input file-input-bordered file-input-sm flex-1"
                        disabled={isUploading}
                      />
                      {selectedFile && (
                        <button
                          onClick={() => handleUpload(fileType)}
                          disabled={isUploading}
                          className="btn btn-primary btn-sm font-thin"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Uploading {uploadProgress[fileType] || 0}%
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              {exists ? "Replace" : "Upload"}
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Upload Progress Bar */}
                    {isUploading && uploadProgress[fileType] !== undefined && (
                      <div className="w-full">
                        <div className="flex justify-between text-xs text-base-content/70 mb-1">
                          <span>Uploading...</span>
                          <span>{uploadProgress[fileType]}%</span>
                        </div>
                        <progress
                          className="progress progress-primary w-full h-2"
                          value={uploadProgress[fileType]}
                          max="100"
                        />
                      </div>
                    )}

                    {selectedFile && (
                      <div className="text-sm text-info">
                        Selected: {selectedFile.name} (
                        {formatFileSize(selectedFile.size)})
                      </div>
                    )}

                    {/* File Actions */}
                    {exists && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(fileType)}
                          disabled={isDeleting}
                          className="btn btn-error btn-sm font-thin"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bulk Actions Info */}
        <div className="card bg-base-100 border border-base-200 mt-6">
          <div className="card-body p-4">
            <h4 className="text-md font-semibold mb-3">
              File Management Information
            </h4>
            <div className="text-sm space-y-2">
              <ul className="list-disc list-inside space-y-1 text-base-content/70">
                <li>
                  Files are automatically renamed to match the language code
                  pattern
                </li>
                <li>
                  Backup copies are created when replacing or deleting existing
                  files
                </li>
                <li>All file operations are logged for auditing purposes</li>
                <li>Maximum file size limits apply based on file type</li>
                <li>
                  File validation is performed on upload to ensure compatibility
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="btn btn-primary font-thin">
            Done
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
