import { useState, useEffect } from "react";
import { languagesAPI } from "../../lib/api";
import type { LanguageHomepage, LanguagesResponse } from "../../types/api";

interface LanguageSelectorProps {
  selectedLanguage?: LanguageHomepage | null;
  onLanguageSelect: (language: LanguageHomepage) => void;
  className?: string;
}

export function LanguageSelector({
  selectedLanguage,
  onLanguageSelect,
  className = "",
}: LanguageSelectorProps) {
  const [languages, setLanguages] = useState<LanguagesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await languagesAPI.getHomepageLanguages();
        setLanguages(data);
      } catch (err) {
        setError("Failed to load languages. Please try again.");
        console.error("Error fetching languages:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLanguages();
  }, []);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <h2 className="text-2xl font-bold text-center">Select Language</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card bg-base-100 shadow-lg p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center space-y-4 ${className}`}>
        <h2 className="text-2xl font-bold">Select Language</h2>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-outline"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!languages || languages.languages.length === 0) {
    return (
      <div className={`text-center space-y-4 ${className}`}>
        <h2 className="text-2xl font-bold">Select Language</h2>
        <p className="text-gray-600">No languages available at the moment.</p>
      </div>
    );
  }

  const renderLanguageGroup = (title: string, languageList: LanguageHomepage[]) => {
    if (languageList.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-1">
          {title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {languageList.map((language) => (
            <div
              key={language.id}
              className={`card cursor-pointer transition-all duration-200 hover:shadow-md border-2 p-4 ${
                selectedLanguage?.id === language.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => onLanguageSelect(language)}
            >
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">
                  {language.display_name}
                </h4>
                <p className="text-sm text-gray-600">
                  {language.language_name}
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  Code: {language.code}
                </p>
                <p className="text-xs text-gray-500">
                  Alphabet: {language.alphabet}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Select Language</h2>
        <p className="text-gray-600">
          Choose the language for your forced alignment task
        </p>
        {selectedLanguage && (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
            Selected: {selectedLanguage.display_name}
          </div>
        )}
      </div>

      {/* Nordic Languages */}
      {renderLanguageGroup("Nordic Languages", languages.grouped_languages.nordic)}

      {/* Other Languages */}
      {renderLanguageGroup("Other Languages", languages.grouped_languages.other)}

      {/* Summary */}
      <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-200">
        {languages.count} language{languages.count !== 1 ? "s" : ""} available
      </div>
    </div>
  );
}