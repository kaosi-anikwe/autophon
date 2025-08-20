import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";

import { languagesAPI } from "../../lib/api";
import type { LanguageHomepage } from "../../types/api";

interface LanguageItemProps {
  language: LanguageHomepage;
}

interface LanguageGroupProps {
  title: string;
  languages: LanguageHomepage[];
}

interface AllLanguagesTooltipProps {
  isVisible: boolean;
  onClose: () => void;
}

// Generic function to get unique objects by a specific property
function getUniqueBy<T, K extends keyof T>(array: T[], property: K): T[] {
  const seen = new Set<T[K]>();
  return array.filter((obj) => {
    const value = obj[property];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

function LanguageItem({ language }: LanguageItemProps) {
  const flagImagePath = `/langs/${language.code}/${language.code}_flag_50.png`;
  const guidePath = `https://new.autophontest.se/api/v1/static/guides/${language.code}.pdf`;

  return (
    <div className="flex items-center">
      <div className="w-full">
        <div className="text-base-content flex items-center font-normal">
          <img
            src={flagImagePath}
            alt={`${language.language_name} flag`}
            className="max-w-6 h-auto rounded-sm mr-4 flex-shrink-0"
            onError={(e) => {
              // Fallback to gray placeholder if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              target.nextElementSibling?.classList.remove("hidden");
            }}
          />
          <div className="w-6 h-4 bg-gray-300 rounded-sm mr-4 flex-shrink-0 hidden"></div>
          <a href={guidePath}>{language.language_name}</a>
        </div>
      </div>
    </div>
  );
}

function LanguageGroup({ title, languages }: LanguageGroupProps) {
  return (
    <>
      <h5 className="text-xl font-bold mb-2">{title}</h5>
      <div className="mb-4">
        {languages.map((language) => (
          <LanguageItem key={language.id} language={language} />
        ))}
      </div>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <>
      {/* Nordic languages skeleton */}
      <h5 className="text-xl font-bold">Nordic languages</h5>
      <div className="space-y-2 mb-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center my-2">
            <div className="w-6 h-4 bg-gray-300 rounded-sm mr-4 flex-shrink-0 animate-pulse"></div>
            <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Other languages skeleton */}
      <h5 className="text-xl font-bold">Other languages</h5>
      <div className="space-y-2 mb-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center my-2">
            <div className="w-6 h-4 bg-gray-300 rounded-sm mr-4 flex-shrink-0 animate-pulse"></div>
            <div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div>
          </div>
        ))}
      </div>
    </>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="text-center py-6">
      <p className="text-red-600 mb-2">Failed to load languages</p>
      <p className="text-sm text-gray-600">{error.message}</p>
    </div>
  );
}

function AllLanguagesTooltip({ isVisible, onClose }: AllLanguagesTooltipProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["all-languages"],
    queryFn: () => languagesAPI.getLanguagesByType(), // Get all languages
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    enabled: isVisible, // Only fetch when tooltip is visible
  });

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-50">
      <div className="card bg-base-100 shadow-lg max-w-xl w-[44rem] border border-base-200">
        <div className="card-header px-4 py-2 border-b border-base-200">
          <div className="flex justify-between items-center">
            <h3 className="card-title font-semibold">
              All Supported Languages
            </h3>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-xs btn-circle"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="card-body p-4 max-h-72 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center py-4">
              <span className="loading loading-spinner loading-md"></span>
              <p className="mt-2 text-base-content/70">Loading languages...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <span className="text-sm">Failed to load all languages</span>
            </div>
          )}

          {data && (
            <div className="grid grid-cols-3 gap-2">
              {getUniqueBy(data.languages, "display_name").map((language) => (
                <div key={language.id} className="flex items-center gap-2 py-1">
                  <img
                    src={`/langs/${language.code}/${language.code}_flag_50.png`}
                    alt={`${language.language_name} flag`}
                    className="w-6 h-auto rounded-sm flex-shrink-0"
                    onError={(e) => {
                      // Fallback to gray placeholder if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                  <div className="w-4 h-3 bg-base-300 rounded-sm flex-shrink-0 hidden"></div>
                  <a
                    href={`https://new.autophontest.se/api/v1/static/guides/${language.code}.pdf`}
                  >
                    <span className="truncate">{language.display_name}</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SupportedLanguages() {
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["homepage-languages"],
    queryFn: languagesAPI.getHomepageLanguages,
    staleTime: 10 * 60 * 1000, // 10 minutes - languages don't change frequently
    retry: 2,
  });

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowAllLanguages(false);
      }
    };

    if (showAllLanguages) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAllLanguages]);

  const handleShowAllLanguages = () => {
    setShowAllLanguages(true);
  };

  const handleCloseAllLanguages = () => {
    setShowAllLanguages(false);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleShowAllLanguages();
    }
  };

  if (isLoading || !data) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState error={error as Error} />;
  }

  const { grouped_languages } = data!;

  return (
    <>
      <LanguageGroup
        title="Nordic languages"
        languages={grouped_languages.nordic}
      />
      <LanguageGroup
        title="Other languages"
        languages={grouped_languages.other}
      />

      <div className="relative" ref={containerRef}>
        <p
          className="text-secondary text-sm italic cursor-pointer transition-colors mb-2"
          tabIndex={0}
          onClick={handleShowAllLanguages}
          onKeyPress={handleKeyPress}
          role="button"
          aria-label="Show all supported languages"
        >
          click for a full list
        </p>

        <AllLanguagesTooltip
          isVisible={showAllLanguages}
          onClose={handleCloseAllLanguages}
        />
      </div>
    </>
  );
}
