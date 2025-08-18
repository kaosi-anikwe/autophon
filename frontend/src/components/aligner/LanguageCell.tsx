import { AxiosError } from "axios";
import { AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";

import { api } from "@/lib/api";
import type { Task, Language } from "@/types/api";
import { useToast } from "@/contexts/ToastContext";
import LanguageDropdown from "./LanguageDropdown";

export default function LanguageCell({
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
        className={`flex items-center align-middle gap-2 cursor-pointer hover:bg-base-300 p-1 rounded ${
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
            value={selectedLanguage!}
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
