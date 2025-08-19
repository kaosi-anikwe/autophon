import { AxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";

import { api } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import type { Task, Language, Engine } from "@/types/api";

export default function EngineCell({
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
  const getLanguageDisplayOptions = useCallback(() => {
    if (!languagesData || !selectedLanguageName) return [];
    return languagesData.filter(
      (lang) => lang.language_name === selectedLanguageName
    );
  }, [languagesData, selectedLanguageName]);

  const handleDisplayNameSelect = useCallback(
    async (languageCode: string) => {
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
            toast.error(
              error.response.data.message,
              "Failed to change language"
            );
          } else {
            toast.error("Failed to change language");
          }
        }
        console.error("Failed to change language:", error);
      } finally {
        setIsChangingLanguage(false);
      }
    },
    [languagesData, task.task_id, toast]
  );

  const isDisabled =
    task.task_status === "completed" ||
    task.task_status === "uploading" ||
    task.pre_error ||
    isChangingLanguage;

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
  }, [
    showDropdown,
    selectedIndex,
    selectedLanguageName,
    getLanguageDisplayOptions,
    handleDisplayNameSelect,
  ]);

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
        className={`flex items-center align-middle gap-2 cursor-pointer hover:bg-base-200/50 p-1 rounded ${
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
        <div className="absolute w-full z-[10]">
          <div
            ref={dropdownRef}
            className="w-full max-h-80 bg-base-100 border border-base-200 rounded-md shadow-lg p-1 z-[100] outline-none"
            tabIndex={0}
          >
            {displayOptions.map((language, index) => (
              <div
                key={language.code}
                onClick={() => handleDisplayNameSelect(language.code)}
                className={`flex items-center gap-2 px-2 py-1.5 hover:bg-base-200/50 cursor-pointer rounded-sm ${
                  selectedIndex === index ? "bg-base-200/80" : ""
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
              <div className="px-2 py-1.5 text-sm text-neutral/50">
                No variants available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
