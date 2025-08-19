import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { adminLanguagesAPI, type CreateLanguageRequest } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { AxiosError } from "axios";
import AlternativesInput from "./AlternativesInput";

const createLanguageSchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(20, "Code must be at most 10 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Code can only contain letters, numbers, and underscores"
    ),
  display_name: z.string().min(1, "Display name is required"),
  language_name: z.string().min(1, "Language name is required"),
  type: z.enum(["nordic", "other", "future"]),
  alphabet: z.string().min(1, "Alphabet is required"),
  priority: z.number().min(1).max(999).optional(),
  homepage: z.boolean().optional(),
  is_active: z.boolean().optional(),
  alternatives: z.string().optional(),
});

type CreateLanguageFormData = z.infer<typeof createLanguageSchema>;

interface CreateLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REQUIRED_FILE_TYPES = [
  { key: "cite", label: "Citation File", extension: ".txt" },
  { key: "cleanup", label: "Cleanup File", extension: ".txt" },
  { key: "complex2simple", label: "Complex to Simple", extension: ".json" },
  { key: "g2p_model", label: "G2P Model", extension: ".zip" },
  { key: "ipa", label: "IPA Mapping", extension: ".json" },
  { key: "meta", label: "Metadata", extension: ".yaml" },
  { key: "simple_dict", label: "Simple Dictionary", extension: ".dict" },
  { key: "normal_dict", label: "Normal Dictionary", extension: ".dict" },
  { key: "dict_json", label: "Dictionary JSON", extension: ".json" },
  { key: "guide_pdf", label: "Guide PDF", extension: ".pdf" },
  { key: "model_zip", label: "Model ZIP", extension: ".zip" },
];

export default function CreateLanguageModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateLanguageModalProps) {
  const [includeFiles, setIncludeFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const toast = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateLanguageFormData>({
    resolver: zodResolver(createLanguageSchema),
    defaultValues: {
      priority: 99,
      homepage: false,
      is_active: true,
    },
  });

  const createLanguageMutation = useMutation({
    mutationFn: async (data: CreateLanguageFormData) => {
      const requestData: CreateLanguageRequest = {
        code: data.code,
        display_name: data.display_name,
        language_name: data.language_name,
        type: data.type,
        alphabet: data.alphabet,
        priority: data.priority,
        homepage: data.homepage,
        is_active: data.is_active,
        alternatives: data.alternatives
          ? data.alternatives
              .split(",")
              .map((alt) => alt.trim())
              .filter(Boolean)
          : undefined,
      };

      if (includeFiles && Object.keys(selectedFiles).length > 0) {
        return adminLanguagesAPI.createLanguageWithFiles(
          requestData,
          selectedFiles,
          (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
          }
        );
      } else {
        return adminLanguagesAPI.createLanguage(requestData);
      }
    },
    onSuccess: (data) => {
      toast.success(data.message, "Language Created");
      reset();
      setSelectedFiles({});
      setIncludeFiles(false);
      setUploadProgress(0);
      onSuccess();
      queryClient.invalidateQueries({ queryKey: ["adminLanguages"] });
    },
    onError: (error: unknown) => {
      if (error instanceof AxiosError) {
        toast.error(
          error.response?.data?.message || "Failed to create language",
          "Creation Failed"
        );
      } else {
        toast.error(error as string, "Creating Failed");
      }
      setUploadProgress(0);
    },
  });

  const handleFileChange = (fileType: string, file: File | null) => {
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

  const onSubmit = (data: CreateLanguageFormData) => {
    if (
      includeFiles &&
      REQUIRED_FILE_TYPES.some((type) => !selectedFiles[type.key])
    ) {
      toast.error(
        "All files are required when creating with files",
        "Missing Files"
      );
      return;
    }
    createLanguageMutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    setSelectedFiles({});
    setIncludeFiles(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Create New Language</h3>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="card bg-base-100 border border-base-200">
            <div className="card-header p-4 border-b border-base-200">
              <h4 className="text-lg font-semibold">Basic Information</h4>
            </div>
            <div className="card-body p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Language Code */}
                <div>
                  <label className="label">
                    <span className="label-text font-medium">
                      Language Code <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    {...register("code")}
                    type="text"
                    placeholder="e.g., lang_ENG_v010"
                    className={`input input-bordered w-full ${
                      errors.code ? "input-error" : ""
                    }`}
                  />
                  {errors.code && (
                    <span className="text-error text-sm">
                      {errors.code.message}
                    </span>
                  )}
                </div>

                {/* Display Name */}
                <div>
                  <label className="label">
                    <span className="label-text font-medium">
                      Display Name <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    {...register("display_name")}
                    type="text"
                    placeholder="e.g., English - ArPA 5.0"
                    className={`input input-bordered w-full ${
                      errors.display_name ? "input-error" : ""
                    }`}
                  />
                  {errors.display_name && (
                    <span className="text-error text-sm">
                      {errors.display_name.message}
                    </span>
                  )}
                </div>

                {/* Language Name */}
                <div>
                  <label className="label">
                    <span className="label-text font-medium">
                      Language Name <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    {...register("language_name")}
                    type="text"
                    placeholder="e.g., English (US), Swedish (Sweden)"
                    className={`input input-bordered w-full ${
                      errors.language_name ? "input-error" : ""
                    }`}
                  />
                  {errors.language_name && (
                    <span className="text-error text-sm">
                      {errors.language_name.message}
                    </span>
                  )}
                </div>

                {/* Type */}
                <div>
                  <label className="label">
                    <span className="label-text font-medium">
                      Type <span className="text-error">*</span>
                    </span>
                  </label>
                  <select
                    {...register("type")}
                    className={`select select-bordered w-full ${
                      errors.type ? "select-error" : ""
                    }`}
                  >
                    <option value="">Select type...</option>
                    <option value="nordic">Nordic</option>
                    <option value="other">Other</option>
                    <option value="future">Future</option>
                  </select>
                  {errors.type && (
                    <span className="text-error text-sm">
                      {errors.type.message}
                    </span>
                  )}
                </div>

                {/* Alphabet */}
                <div>
                  <label className="label">
                    <span className="label-text font-medium">
                      Alphabet <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    {...register("alphabet")}
                    type="text"
                    placeholder="e.g., DanfaBet"
                    className={`input input-bordered w-full ${
                      errors.alphabet ? "input-error" : ""
                    }`}
                  />
                  {errors.alphabet && (
                    <span className="text-error text-sm">
                      {errors.alphabet.message}
                    </span>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="label">
                    <span className="label-text font-medium">Priority</span>
                  </label>
                  <input
                    {...register("priority", { valueAsNumber: true })}
                    type="number"
                    min="1"
                    max="999"
                    placeholder="99"
                    className="input input-bordered w-full"
                  />
                  <span className="text-xs text-base-content/60">
                    Lower numbers appear first
                  </span>
                </div>
              </div>

              {/* Alternatives */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">
                    Alternative Languages
                  </span>
                </label>
                <Controller
                  name="alternatives"
                  control={control}
                  render={({ field }) => (
                    <AlternativesInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      excludeCode={watch("code")}
                      className="w-full"
                    />
                  )}
                />
                <span className="text-xs text-base-content/60">
                  Select from existing language codes or type manually
                </span>
              </div>

              {/* Checkboxes */}
              <div className="flex gap-6">
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    {...register("homepage")}
                    type="checkbox"
                    className="checkbox checkbox-primary"
                  />
                  <span className="label-text">Show on homepage</span>
                </label>
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    {...register("is_active")}
                    type="checkbox"
                    className="checkbox checkbox-primary"
                  />
                  <span className="label-text">Active</span>
                </label>
              </div>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="card bg-base-100 border border-base-200">
            <div className="card-header p-4 border-b border-base-200">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">Language Files</h4>
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    checked={includeFiles}
                    onChange={(e) => setIncludeFiles(e.target.checked)}
                    className="checkbox checkbox-primary"
                  />
                  <span className="label-text">Include files in creation</span>
                </label>
              </div>
            </div>

            {includeFiles && (
              <div className="card-body p-4">
                <div className="alert alert-info mb-4">
                  <AlertTriangle className="w-5 h-5" />
                  <span>
                    All 11 files are required when creating a language with
                    files.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {REQUIRED_FILE_TYPES.map((fileType) => (
                    <div key={fileType.key} className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">
                          {fileType.label}
                          <span className="text-xs text-base-content/60 ml-1">
                            ({fileType.extension})
                          </span>
                        </span>
                      </label>
                      <input
                        type="file"
                        accept={fileType.extension}
                        onChange={(e) =>
                          handleFileChange(
                            fileType.key,
                            e.target.files?.[0] || null
                          )
                        }
                        className="file-input file-input-bordered file-input-sm w-full"
                      />
                      {selectedFiles[fileType.key] && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle className="w-3 h-3 text-success" />
                          <span className="text-xs text-success">
                            {selectedFiles[fileType.key].name}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-warning/10 rounded-lg">
                  <div className="text-sm">
                    <strong>Info:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>
                        Files will be automatically renamed to match the
                        language code
                      </li>
                      <li>
                        Backup copies will be created for any existing files
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-ghost"
              disabled={createLanguageMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLanguageMutation.isPending}
              className="btn btn-primary font-thin"
            >
              {createLanguageMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {includeFiles && Object.keys(selectedFiles).length > 0
                    ? `Uploading... ${uploadProgress}%`
                    : "Creating..."}
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Language
                </>
              )}
            </button>
          </div>

          {/* Upload Progress Bar */}
          {createLanguageMutation.isPending &&
            includeFiles &&
            Object.keys(selectedFiles).length > 0 && (
              <div className="px-6 pb-6">
                <div className="flex justify-between text-xs text-base-content/70 mb-2">
                  <span>Uploading files...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <progress
                  className="progress progress-primary w-full h-3"
                  value={uploadProgress}
                  max="100"
                />
              </div>
            )}
        </form>
      </div>
      <div className="modal-backdrop" onClick={handleClose}></div>
    </div>
  );
}
