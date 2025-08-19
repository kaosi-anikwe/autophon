import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { X, Save, Loader2 } from "lucide-react";
import {
  adminLanguagesAPI,
  type AdminLanguage,
  type UpdateLanguageRequest,
} from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { AxiosError } from "axios";
import AlternativesInput from "./AlternativesInput";

const updateLanguageSchema = z.object({
  display_name: z.string().min(1, "Display name is required"),
  language_name: z.string().min(1, "Language name is required"),
  type: z.enum(["nordic", "other", "future"]),
  alphabet: z.string().min(1, "Alphabet is required"),
  priority: z.number().min(1).max(999),
  homepage: z.boolean(),
  is_active: z.boolean(),
  alternatives: z.string().optional(),
});

type UpdateLanguageFormData = z.infer<typeof updateLanguageSchema>;

interface EditLanguageModalProps {
  isOpen: boolean;
  language: AdminLanguage;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditLanguageModal({
  isOpen,
  language,
  onClose,
  onSuccess,
}: EditLanguageModalProps) {
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<UpdateLanguageFormData>({
    resolver: zodResolver(updateLanguageSchema),
  });

  useEffect(() => {
    if (language) {
      reset({
        display_name: language.display_name,
        language_name: language.language_name,
        type: language.type,
        alphabet: language.alphabet,
        priority: language.priority,
        homepage: language.homepage,
        is_active: language.is_active,
        alternatives: language.alternatives?.join(", ") || "",
      });
    }
  }, [language, reset]);

  const updateLanguageMutation = useMutation({
    mutationFn: async (data: UpdateLanguageFormData) => {
      const requestData: UpdateLanguageRequest = {
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

      return adminLanguagesAPI.updateLanguage(language.id, requestData);
    },
    onSuccess: (data) => {
      toast.success(data.message, "Language Updated");
      onSuccess();
    },
    onError: (error: unknown) => {
      if (error instanceof AxiosError) {
        toast.error(
          error.response?.data?.message || "Failed to update language",
          "Update Failed"
        );
      } else {
        toast.error(error as string, "Update Failed");
      }
    },
  });

  const onSubmit = (data: UpdateLanguageFormData) => {
    updateLanguageMutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold">Edit Language</h3>
            <p className="text-base-content/70">
              Editing: {language.display_name} ({language.code})
            </p>
          </div>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="card bg-base-100 border border-base-200">
            <div className="card-header p-4 border-b border-base-200">
              <h4 className="text-lg font-semibold">Language Information</h4>
              <p className="text-sm text-base-content/60">
                Language code{" "}
                <span className="text-xs font-mono bg-base-200 px-2 py-1 rounded">
                  {language.code}
                </span>{" "}
                cannot be changed
              </p>
            </div>
            <div className="card-body p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      Full Language Name <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    {...register("language_name")}
                    type="text"
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
                      excludeCode={language.code}
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

          {/* Current Status */}
          <div className="card bg-base-100 border border-base-200">
            <div className="card-body p-4">
              <h4 className="text-md font-semibold mb-3">Current Status</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-base-content/60">Created:</span>
                  <div className="font-medium">
                    {new Date(language.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-base-content/60">Updated:</span>
                  <div className="font-medium">
                    {new Date(language.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-base-content/60">Files Status:</span>
                  <div
                    className={`font-medium ${
                      language.is_complete ? "text-success" : "text-warning"
                    }`}
                  >
                    {language.is_complete
                      ? "Complete"
                      : `${language.missing_files?.length || 0} missing`}
                  </div>
                </div>
                <div>
                  <span className="text-base-content/60">Status:</span>
                  <div
                    className={`font-medium ${
                      language.is_active ? "text-success" : "text-error"
                    }`}
                  >
                    {language.is_active ? "Active" : "Inactive"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-ghost"
              disabled={updateLanguageMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateLanguageMutation.isPending || !isDirty}
              className="btn btn-primary font-thin"
            >
              {updateLanguageMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={handleClose}></div>
    </div>
  );
}
