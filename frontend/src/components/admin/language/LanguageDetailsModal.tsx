import {
  X,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Hash,
  Globe,
  Home,
  Eye,
  EyeOff,
} from "lucide-react";
import { computeLanguageCompletion, type AdminLanguage } from "@/lib/api";

interface LanguageDetailsModalProps {
  isOpen: boolean;
  language: AdminLanguage;
  onClose: () => void;
}

const FILE_TYPE_INFO = {
  cite: {
    label: "Citation File",
    description: "Citation information for the language",
  },
  cleanup: { label: "Cleanup File", description: "Text cleanup instructions" },
  complex2simple: {
    label: "Complex to Simple",
    description: "Phoneme mapping for complex to simple conversion",
  },
  g2p_model: {
    label: "G2P Model",
    description: "Grapheme-to-phoneme model (ZIP)",
  },
  ipa: {
    label: "IPA Mapping",
    description: "International Phonetic Alphabet mappings",
  },
  meta: {
    label: "Metadata",
    description: "Language metadata and configuration (YAML)",
  },
  simple_dict: {
    label: "Simple Dictionary",
    description: "Simplified pronunciation dictionary",
  },
  normal_dict: {
    label: "Normal Dictionary",
    description: "Standard pronunciation dictionary",
  },
  dict_json: {
    label: "Dictionary JSON",
    description: "Dictionary in JSON format",
  },
  guide_pdf: {
    label: "User Guide",
    description: "User guide documentation (PDF)",
  },
  model_zip: {
    label: "Language Model",
    description: "Complete language model (ZIP)",
  },
};

export default function LanguageDetailsModal({
  isOpen,
  language,
  onClose,
}: LanguageDetailsModalProps) {
  if (!isOpen) return null;

  // Ensure the language has computed completion properties
  const computedLanguage = computeLanguageCompletion(language);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "nordic":
        return "text-info";
      case "other":
        return "text-primary";
      case "future":
        return "text-warning";
      default:
        return "text-neutral";
    }
  };

  const availableFiles = Object.entries(
    computedLanguage.file_info || {}
  ).filter(([, info]) => info.exists);
  const missingFiles = computedLanguage.missing_files || [];

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-3">
              {computedLanguage.display_name}
              <span className="text-lg font-mono bg-base-200 px-3 py-1 rounded">
                {computedLanguage.code}
              </span>
            </h3>
            <p className="text-base-content/70">
              {computedLanguage.language_name}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Basic Information */}
        <div className="card bg-base-100 border border-base-200 mb-6">
          <div className="card-header p-4 border-b border-base-200">
            <h4 className="text-lg font-semibold">Basic Information</h4>
          </div>
          <div className="card-body p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center gap-2 text-base-content/60 mb-1">
                  <Hash className="w-4 h-4" />
                  <span className="text-sm">Language Code</span>
                </div>
                <div className="font-semibold">{computedLanguage.code}</div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-base-content/60 mb-1">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">Type</span>
                </div>
                <div
                  className={`font-semibold capitalize ${getTypeColor(
                    computedLanguage.type
                  )}`}
                >
                  {computedLanguage.type}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-base-content/60 mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">Alphabet</span>
                </div>
                <div className="font-semibold capitalize">
                  {computedLanguage.alphabet}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-base-content/60 mb-1">
                  <Hash className="w-4 h-4" />
                  <span className="text-sm">Priority</span>
                </div>
                <div className="font-semibold">{computedLanguage.priority}</div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-base-content/60 mb-1">
                  <Home className="w-4 h-4" />
                  <span className="text-sm">Homepage</span>
                </div>
                <div className="flex items-center gap-1">
                  {computedLanguage.homepage ? (
                    <>
                      <Eye className="w-4 h-4 text-success" />
                      <span className="font-semibold text-success">
                        Visible
                      </span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 text-base-content/50" />
                      <span className="font-semibold text-base-content/50">
                        Hidden
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-base-content/60 mb-1">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Status</span>
                </div>
                <div className="flex items-center gap-1">
                  {computedLanguage.is_active ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="font-semibold text-success">Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-error" />
                      <span className="font-semibold text-error">Inactive</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Alternatives */}
            {computedLanguage.alternatives &&
              computedLanguage.alternatives.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-base-content/60 mb-2">
                    <Globe className="w-4 h-4" />
                    <span className="text-sm">Alternative Languages</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {computedLanguage.alternatives.map((alt) => (
                      <span
                        key={alt}
                        className="badge badge-sm bg-base-200 font-mono"
                      >
                        {alt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* File Status */}
        <div className="card bg-base-100 border border-base-200 mb-6">
          <div className="card-header p-4 border-b border-base-200">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">File Status</h4>
              <div className="flex items-center gap-2">
                {computedLanguage.is_complete ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="text-success font-medium">Complete</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    <span className="text-warning font-medium">
                      {missingFiles.length} file(s) missing
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="card-body p-4">
            {/* Available Files */}
            {availableFiles.length > 0 && (
              <div className="mb-6">
                <h5 className="font-medium text-success mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Available Files ({availableFiles.length})
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableFiles.map(([fileType, fileInfo]) => (
                    <div
                      key={fileType}
                      className="border border-success/20 bg-success/5 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">
                          {FILE_TYPE_INFO[
                            fileType as keyof typeof FILE_TYPE_INFO
                          ]?.label || fileType}
                        </div>
                        <CheckCircle className="w-4 h-4 text-success" />
                      </div>
                      <div className="text-xs text-base-content/60 space-y-1">
                        <div>Size: {formatFileSize(fileInfo.size)}</div>
                        {fileInfo.modified && (
                          <div>Modified: {formatDate(fileInfo.modified)}</div>
                        )}
                      </div>
                      <div className="text-xs text-base-content/50 mt-1">
                        {
                          FILE_TYPE_INFO[
                            fileType as keyof typeof FILE_TYPE_INFO
                          ]?.description
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Files */}
            {missingFiles.length > 0 && (
              <div>
                <h5 className="font-medium text-warning mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Missing Files ({missingFiles.length})
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {missingFiles.map((fileType) => (
                    <div
                      key={fileType}
                      className="border border-warning/20 bg-warning/5 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">
                          {FILE_TYPE_INFO[
                            fileType as keyof typeof FILE_TYPE_INFO
                          ]?.label || fileType}
                        </div>
                        <XCircle className="w-4 h-4 text-warning" />
                      </div>
                      <div className="text-xs text-base-content/50">
                        {
                          FILE_TYPE_INFO[
                            fileType as keyof typeof FILE_TYPE_INFO
                          ]?.description
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div className="card bg-base-100 border border-base-200">
          <div className="card-header p-4 border-b border-base-200">
            <h4 className="text-lg font-semibold">Timeline</h4>
          </div>
          <div className="card-body p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 text-base-content/60 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Created</span>
                </div>
                <div className="font-semibold">
                  {formatDate(computedLanguage.created_at)}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-base-content/60 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Last Updated</span>
                </div>
                <div className="font-semibold">
                  {formatDate(computedLanguage.updated_at)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="btn btn-primary font-thin">
            Close
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
