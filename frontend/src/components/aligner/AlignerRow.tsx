import { AxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Download, FileX, AlertCircle } from "lucide-react";

import { api } from "@/lib/api";
import LanguageDropdown from "./LanguageDropdown";
import { useToast } from "@/contexts/ToastContext";
import type { Task, Language, Engine } from "@/types/api";

type AligerRowProps = {
  task: Task;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export default function AlignerRow({
  task,
  checked = false,
  onCheckedChange,
}: AligerRowProps) {
  const [selectedLanguageName, setSelectedLanguageName] = useState<
    string | undefined
  >(task.language?.language_name);
  const [shouldOpenEngineDropdown, setShouldOpenEngineDropdown] =
    useState(false);

  // Determine if task has errors
  const hasPreError = task.pre_error === true;
  const isUploading = task.task_status === "uploading";

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
    <tr className="text-center nth-[even]:bg-base-200/20">
      {/* Empty column for trash icon alignment */}
      <td></td>

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
      <td>{task.download_title}</td>

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
        ) : (
          task.task_status.toUpperCase()
        )}
      </td>

      {/* Download column */}
      <td>
        {downloadUrl ? (
          <a
            href={downloadUrl}
            className="btn btn-ghost btn-xs"
            title="Download files"
            download
          >
            <Download className="w-4 h-4" />
          </a>
        ) : hasPreError ? (
          <p className="text-center flex justify-around">
            <FileX className="w-4 h-4 text-error" title="No files available" />
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

// Language Cell Component
function LanguageCell({
  task,
  onLanguageSelected,
}: {
  task: Task;
  onLanguageSelected?: (languageName: string) => void;
}) {
  // toast for showing status
  const toast = useToast();

  const [selectedLanguage, setSelectedLanguage] = useState(
    task.language?.language_name
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch languages
  const { data: languagesData } = useQuery<Language[]>({
    queryKey: ["languages"],
    queryFn: async () => {
      const response = await api.get("/languages");
      return response.data.languages;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleLanguageChange = async (languageName: string) => {
    setIsChangingLanguage(true);
    try {
      // Find all languages with this language_name
      const languageOptions = languagesData?.filter(
        (lang) => lang.language_name === languageName
      );

      if (!languageOptions || languageOptions.length === 0) {
        toast.error("Language not found");
        return;
      }

      // If only one option, submit immediately
      if (languageOptions.length === 1) {
        await api.post("/tasks/change-language", {
          task_id: task.task_id,
          new_lang: languageOptions[0].code,
        });

        setSelectedLanguage(languageName);
        setShowDropdown(false);
        toast.success(`Language changed to ${languageOptions[0].display_name}`);
      } else {
        // Multiple options - close language dropdown and trigger engine dropdown
        setSelectedLanguage(languageName);
        setShowDropdown(false);
        // Notify parent to open engine dropdown
        onLanguageSelected?.(languageName);
      }
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        if (error.response?.data) {
          toast.error(error.response.data.message, "Failed to change language");
        } else {
          toast.error("Failed to change language");
        }
      }
      console.error("Failed to change language:", error);
    } finally {
      setIsChangingLanguage(false);
    }
  };

  const isDisabled =
    task.task_status === "uploading" || task.pre_error || isChangingLanguage;
  const hasPreError = task.pre_error === true;

  // Update dropdown position when shown
  useEffect(() => {
    if (showDropdown && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [showDropdown]);

  const getLanguageFlag = () => {
    if (languagesData && selectedLanguage) {
      const language = languagesData.find(
        (lang) => lang.language_name == selectedLanguage
      );
      return `/langs/${language?.code}/${language?.code}_flag_50.png`;
    }
  };

  const getLanguageDisplay = () => {
    if (hasPreError) {
      return "pre-processing error";
    }

    if (isChangingLanguage) {
      return "Changing...";
    }

    if (languagesData && selectedLanguage) {
      const language = languagesData.find(
        (lang) => lang.language_name === selectedLanguage
      );
      // Show language_name (general language) on the span trigger
      return language ? language.language_name : selectedLanguage;
    }

    return selectedLanguage || "Unknown";
  };

  // Show error state for pre-processing errors
  if (hasPreError) {
    return (
      <span className="flex items-center gap-2 text-error text-sm rounded border border-base-200 p-1">
        <AlertCircle className="w-4 h-4" />
        pre-processing error
      </span>
    );
  }

  // Show skeleton while loading languages data
  if (!languagesData) {
    return (
      <div className="flex items-center gap-2 text-sm rounded border border-base-200 p-1">
        <div className="w-4 h-4 bg-base-200 rounded animate-pulse"></div>
        <div className="w-12 h-4 bg-base-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded w-full border border-base-200"
    >
      {/* Clickable span to show dropdown */}
      <span
        className={`flex items-center align-middle gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded ${
          isDisabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
        onClick={() => !isDisabled && setShowDropdown(!showDropdown)}
      >
        {isChangingLanguage ? (
          <img src="/spinner.gif" alt="Changing..." className="w-auto h-6" />
        ) : selectedLanguage ? (
          <img
            src={getLanguageFlag()}
            alt={selectedLanguage}
            className="w-6 h-6 object-cover rounded-sm"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        {getLanguageDisplay()}
      </span>

      {/* Dropdown - positioned outside table container */}
      {showDropdown && !isDisabled && (
        <div
          className="fixed z-[9999]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          <LanguageDropdown
            key={selectedLanguage}
            value={selectedLanguage}
            onChange={handleLanguageChange}
            languages={languagesData}
            disabled={isDisabled}
            onClose={() => setShowDropdown(false)}
            inline={true}
          />
        </div>
      )}
    </div>
  );
}

// Engine Cell Component (now shows language display_name options)
function EngineCell({
  task,
  selectedLanguageName,
  shouldOpen,
  onDropdownOpened,
}: {
  task: Task;
  selectedLanguageName: string | undefined;
  shouldOpen: boolean;
  onDropdownOpened: () => void;
}) {
  // toast for showing status
  const toast = useToast();

  const [showDropdown, setShowDropdown] = useState(false);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all languages to get display_name options
  const { data: languagesData } = useQuery<Language[]>({
    queryKey: ["languages"],
    queryFn: async () => {
      const response = await api.get("/languages");
      return response.data.languages;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: enginesData } = useQuery<Engine[]>({
    queryKey: ["engines"],
    queryFn: async () => {
      const response = await api.get(`/engines`);
      return response.data.engines;
    },
    enabled: !!task.language?.code,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-open dropdown when shouldOpen is true
  useEffect(() => {
    if (shouldOpen) {
      setShowDropdown(true);
      onDropdownOpened();
    }
  }, [shouldOpen, onDropdownOpened]);

  // Get language display_name options for the selected language_name
  const getLanguageDisplayOptions = () => {
    if (!languagesData || !selectedLanguageName) return [];
    return languagesData.filter(
      (lang) => lang.language_name === selectedLanguageName
    );
  };

  const handleDisplayNameSelect = async (languageCode: string) => {
    setIsChangingLanguage(true);
    try {
      await api.post("/tasks/change-language", {
        task_id: task.task_id,
        new_lang: languageCode,
      });

      const language = languagesData?.find(
        (lang) => lang.code === languageCode
      );
      setShowDropdown(false);
      toast.success(`Language changed to ${language?.display_name}`);
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        if (error.response?.data) {
          toast.error(error.response.data.message, "Failed to change language");
        } else {
          toast.error("Failed to change language");
        }
      }
      console.error("Failed to change language:", error);
    } finally {
      setIsChangingLanguage(false);
    }
  };

  const isDisabled =
    task.task_status === "uploading" || task.pre_error || isChangingLanguage;

  // Update dropdown position when shown
  useEffect(() => {
    if (showDropdown && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [showDropdown]);

  // Reset selected index when dropdown options change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [selectedLanguageName]);

  // Keyboard navigation for dropdown
  useEffect(() => {
    if (!showDropdown || !dropdownRef.current) return;

    const displayOptions = getLanguageDisplayOptions();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!displayOptions.length) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < displayOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : displayOptions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && displayOptions[selectedIndex]) {
            handleDisplayNameSelect(displayOptions[selectedIndex].code);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowDropdown(false);
          break;
      }
    };

    const dropdown = dropdownRef.current;
    dropdown.addEventListener("keydown", handleKeyDown);
    dropdown.focus();

    return () => {
      dropdown.removeEventListener("keydown", handleKeyDown);
    };
  }, [showDropdown, selectedIndex, selectedLanguageName]);

  // Get engine icon based on the language's associated engine
  const getEngineIcon = (languageCode: string) => {
    const engine = enginesData?.find((eng) => languageCode.includes(eng.code));
    return `/ngins/${engine?.code}.png`;
  };

  if (!languagesData && !enginesData) {
    return (
      <div className="w-16 h-4 bg-base-200 rounded animate-pulse mx-auto"></div>
    );
  }

  const displayOptions = getLanguageDisplayOptions();
  const currentLanguage = languagesData?.find(
    (lang) => lang.code === task.language?.code
  );

  return (
    <div
      ref={containerRef}
      className="relative rounded w-full border border-base-200"
    >
      {/* Clickable span to show dropdown */}
      <span
        className={`flex items-center align-middle gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded ${
          isDisabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
        onClick={() =>
          !isDisabled && setShowDropdown((showDropdown) => !showDropdown)
        }
      >
        {isChangingLanguage ? (
          <img src="/spinner.gif" alt="Changing..." className="w-auto h-6" />
        ) : currentLanguage ? (
          <img
            src={getEngineIcon(currentLanguage.code)}
            alt={currentLanguage.display_name}
            className="w-6 h-6 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <span className="text-sm">
          {isChangingLanguage
            ? "Changing..."
            : currentLanguage?.display_name || task.engine?.code || "N/A"}
        </span>
      </span>

      {/* Dropdown - positioned outside table container */}
      {showDropdown && !isDisabled && selectedLanguageName && (
        <div
          className="fixed z-[9999]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          <div
            ref={dropdownRef}
            className="w-full max-h-80 bg-white border border-base-200 rounded-md shadow-lg p-1 z-[100] outline-none"
            tabIndex={0}
          >
            {displayOptions.map((language, index) => (
              <div
                key={language.code}
                onClick={() => handleDisplayNameSelect(language.code)}
                className={`flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 cursor-pointer rounded-sm ${
                  selectedIndex === index ? "bg-blue-100" : ""
                }`}
              >
                <img
                  src={getEngineIcon(language.code)}
                  alt={language.display_name}
                  className="w-6 h-6 object-contain"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {language.display_name}
                  </span>
                </div>
              </div>
            ))}

            {displayOptions.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-gray-500">
                No variants available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
