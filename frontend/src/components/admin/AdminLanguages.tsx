import { useState, useCallback } from "react";
import {
  Languages,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Home,
  FileText,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminLanguagesAPI,
  computeLanguageCompletion,
  type AdminLanguage,
} from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { AxiosError } from "axios";

import CreateLanguageModal from "./language/CreateLanguageModal";
import EditLanguageModal from "./language/EditLanguageModal";
import LanguageDetailsModal from "./language/LanguageDetailsModal";
import FileManagementModal from "./language/FileManagementModal";

export default function AdminLanguages() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "nordic" | "other" | "future"
  >("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [filterCompletion, setFilterCompletion] = useState<
    "all" | "complete" | "incomplete"
  >("all");
  const [filterHomepage, setFilterHomepage] = useState<
    "all" | "homepage" | "not_homepage"
  >("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] =
    useState<AdminLanguage | null>(null);

  const queryClient = useQueryClient();
  const toast = useToast();

  const {
    data: languagesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["adminLanguages"],
    queryFn: () => adminLanguagesAPI.getLanguages(),
    select: (data) => {
      // Ensure all languages have computed completion status
      return {
        ...data,
        languages: data.languages?.map(computeLanguageCompletion) || [],
      };
    },
  });

  const deleteLanguageMutation = useMutation({
    mutationFn: ({ id, deleteFiles }: { id: number; deleteFiles: boolean }) =>
      adminLanguagesAPI.deleteLanguage(id, deleteFiles),
    onSuccess: (data) => {
      toast.success(data.message, "Language Deleted");
      queryClient.invalidateQueries({ queryKey: ["adminLanguages"] });
    },
    onError: (error: unknown) => {
      if (error instanceof AxiosError) {
        toast.error(
          error.response?.data?.message || "Failed to delete language",
          "Delete Failed"
        );
      } else {
        toast.error(error as string, "Delete Failed");
      }
    },
  });

  const handleEdit = useCallback((language: AdminLanguage) => {
    setSelectedLanguage(language);
    setShowEditModal(true);
  }, []);

  const handleViewDetails = useCallback((language: AdminLanguage) => {
    setSelectedLanguage(language);
    setShowDetailsModal(true);
  }, []);

  const handleManageFiles = useCallback((language: AdminLanguage) => {
    setSelectedLanguage(language);
    setShowFileModal(true);
  }, []);

  const handleDelete = useCallback(
    (language: AdminLanguage) => {
      const deleteFiles = window.confirm(
        `Do you want to delete the language files as well? Click OK to delete files, Cancel to keep files.`
      );

      if (
        window.confirm(
          `Are you sure you want to delete the language "${
            language.display_name
          }" (${language.code})? ${
            deleteFiles
              ? "This will also delete all associated files."
              : "Files will be preserved."
          }`
        )
      ) {
        deleteLanguageMutation.mutate({ id: language.id, deleteFiles });
      }
    },
    [deleteLanguageMutation]
  );

  const filteredLanguages =
    languagesData?.languages?.filter((language) => {
      const matchesSearch =
        language.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        language.display_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        language.language_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterType === "all" || language.type === filterType;
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && language.is_active) ||
        (filterStatus === "inactive" && !language.is_active);
      const matchesCompletion =
        filterCompletion === "all" ||
        (filterCompletion === "complete" && language.is_complete) ||
        (filterCompletion === "incomplete" && !language.is_complete);
      const matchesHomepage =
        filterHomepage === "all" ||
        (filterHomepage === "homepage" && language.homepage) ||
        (filterHomepage === "not_homepage" && !language.homepage);

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesCompletion &&
        matchesHomepage
      );
    }) || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "nordic":
        return "badge-info";
      case "other":
        return "badge-primary";
      case "future":
        return "badge-warning";
      default:
        return "badge-neutral";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg">Loading languages...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to Load Languages</h2>
          <p className="text-base-content/70">
            Unable to retrieve language data
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl leading-[1.1] text-left mb-2">
            Language Management
          </h1>
          <p className="text-base-content/70">
            Manage languages, file resources, and configurations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Languages className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold text-primary">
              {filteredLanguages.length} languages
            </span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary font-thin"
          >
            <Plus className="w-5 h-5" />
            Add Language
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card bg-base-100 shadow-lg border border-base-200 mb-6">
        <div className="card-body p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
                <input
                  type="text"
                  placeholder="Search by code, display name, or language name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input input-bordered w-full pl-10"
                />
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-base-content/50" />
                {/* Type Filter */}
                <select
                  value={filterType}
                  onChange={(e) =>
                    setFilterType(e.target.value as typeof filterType)
                  }
                  className="select select-bordered select-sm"
                >
                  <option value="all">All Types</option>
                  <option value="nordic">Nordic</option>
                  <option value="other">Other</option>
                  <option value="future">Future</option>
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as typeof filterStatus)
                }
                className="select select-bordered select-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {/* Completion Filter */}
              <select
                value={filterCompletion}
                onChange={(e) =>
                  setFilterCompletion(e.target.value as typeof filterCompletion)
                }
                className="select select-bordered select-sm"
              >
                <option value="all">All Completion</option>
                <option value="complete">Complete</option>
                <option value="incomplete">Incomplete</option>
              </select>

              {/* Homepage Filter */}
              <select
                value={filterHomepage}
                onChange={(e) =>
                  setFilterHomepage(e.target.value as typeof filterHomepage)
                }
                className="select select-bordered select-sm"
              >
                <option value="all">All Homepage</option>
                <option value="homepage">On Homepage</option>
                <option value="not_homepage">Not on Homepage</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Languages Table */}
      <div className="card bg-base-100 shadow-lg border border-base-200">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Language</th>
                <th>Type</th>
                <th>Status</th>
                <th>Files</th>
                <th>Priority</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLanguages.map((language) => (
                <tr key={language.id} className="hover:bg-base-200/50">
                  {/* Language Info */}
                  <td>
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        {language.display_name}
                        <span className="text-xs font-mono bg-base-200 px-2 py-1 rounded">
                          {language.code}
                        </span>
                        {language.homepage && (
                          <Home className="w-4 h-4 text-accent" />
                        )}
                      </div>
                      <div className="text-sm text-base-content/70">
                        {language.language_name}
                      </div>
                      <div className="text-xs text-base-content/50">
                        {language.alphabet} alphabet
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td>
                    <span
                      className={`badge ${getTypeColor(
                        language.type
                      )} badge-sm`}
                    >
                      {language.type}
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    <div className="space-y-1">
                      {language.is_active ? (
                        <div className="flex items-center gap-1 text-success">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-error">
                          <XCircle className="w-4 h-4" />
                          <span className="text-sm">Inactive</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Files Status */}
                  <td>
                    <div className="space-y-1">
                      {language.is_complete ? (
                        <div className="flex items-center gap-1 text-success">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Complete</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-warning">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm">
                            {language.missing_files?.length || 0} missing
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Priority */}
                  <td>
                    <span className="text-sm">{language.priority}</span>
                  </td>

                  {/* Created Date */}
                  <td>
                    <span className="text-sm">
                      {formatDate(language.created_at)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="flex gap-1">
                      {/* View Details */}
                      <div className="tooltip" data-tip="View Details">
                        <button
                          onClick={() => handleViewDetails(language)}
                          className="btn btn-ghost btn-xs"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Edit */}
                      <div className="tooltip" data-tip="Edit Language">
                        <button
                          onClick={() => handleEdit(language)}
                          className="btn btn-primary btn-xs"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Manage Files */}
                      <div className="tooltip" data-tip="Manage Files">
                        <button
                          onClick={() => handleManageFiles(language)}
                          className="btn btn-info btn-xs"
                        >
                          <FileText className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Delete */}
                      <div className="tooltip" data-tip="Delete Language">
                        <button
                          onClick={() => handleDelete(language)}
                          disabled={deleteLanguageMutation.isPending}
                          className="btn btn-error btn-xs"
                        >
                          {deleteLanguageMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLanguages.length === 0 && (
            <div className="text-center py-8">
              <Languages className="w-12 h-12 text-base-content/20 mx-auto mb-4" />
              <p className="text-base-content/60">
                No languages found matching your criteria
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <div className="card bg-base-100 shadow-lg border border-base-200 mt-6">
        <div className="card-body p-6">
          <h3 className="text-lg font-bold mb-4">Language Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat">
              <div className="stat-title text-sm">Total Languages</div>
              <div className="stat-value text-2xl">
                {languagesData?.count || 0}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title text-sm">Active</div>
              <div className="stat-value text-2xl text-success">
                {languagesData?.languages?.filter((l) => l.is_active).length ||
                  0}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title text-sm">Complete</div>
              <div className="stat-value text-2xl text-info">
                {languagesData?.languages?.filter((l) => l.is_complete)
                  .length || 0}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title text-sm">Homepage</div>
              <div className="stat-value text-2xl text-warning">
                {languagesData?.languages?.filter((l) => l.homepage).length ||
                  0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateLanguageModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["adminLanguages"] });
            setShowCreateModal(false);
          }}
        />
      )}

      {showEditModal && selectedLanguage && (
        <EditLanguageModal
          isOpen={showEditModal}
          language={selectedLanguage}
          onClose={() => {
            setShowEditModal(false);
            setSelectedLanguage(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["adminLanguages"] });
            setShowEditModal(false);
            setSelectedLanguage(null);
          }}
        />
      )}

      {showDetailsModal && selectedLanguage && (
        <LanguageDetailsModal
          isOpen={showDetailsModal}
          language={selectedLanguage}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedLanguage(null);
          }}
        />
      )}

      {showFileModal && selectedLanguage && (
        <FileManagementModal
          isOpen={showFileModal}
          language={selectedLanguage}
          onClose={() => {
            setShowFileModal(false);
            setSelectedLanguage(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["adminLanguages"] });
          }}
        />
      )}
    </>
  );
}
