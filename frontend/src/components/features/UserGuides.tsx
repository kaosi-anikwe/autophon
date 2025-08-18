import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download } from "lucide-react";
import { api } from "@/lib/api";
import type { Language } from "@/types/api";

type UserGuideProps = {
  children: React.ReactNode;
};

export default function UserGuides({ children }: UserGuideProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch all languages (no refetch needed as they don't change often)
  const { data: languages } = useQuery<Language[]>({
    queryKey: ["languages"],
    queryFn: async () => {
      const response = await api.get("/languages");
      return response.data.languages;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - languages don't change often
  });

  // Filter languages based on search term
  const filteredLanguages = useMemo(() => {
    if (!languages || !searchTerm.trim()) return [];

    const term = searchTerm.toLowerCase();
    return languages
      .filter(
        (language) =>
          language.language_name.toLowerCase().includes(term) ||
          language.display_name.toLowerCase().includes(term) ||
          language.code.toLowerCase().includes(term)
      )
      .slice(0, 8); // Limit to 8 results
  }, [languages, searchTerm]);

  const handleDownload = (languageCode: string, languageName: string) => {
    const downloadUrl = `https://new.autophontest.se/api/v1/static/guides/${languageCode}.pdf`;

    // Create a temporary anchor element to trigger download
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${languageName}_guide.pdf`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clear search and hide dropdown
    setSearchTerm("");
    setShowDropdown(false);
  };

  // Show/hide dropdown based on search term and results
  useEffect(() => {
    setShowDropdown(
      searchTerm.trim().length > 0 && filteredLanguages.length > 0
    );
    setSelectedIndex(-1);
  }, [searchTerm, filteredLanguages.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!showDropdown) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredLanguages.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredLanguages.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && filteredLanguages[selectedIndex]) {
            const language = filteredLanguages[selectedIndex];
            handleDownload(language.code, language.display_name);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowDropdown(false);
          setSearchTerm("");
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showDropdown, selectedIndex, filteredLanguages]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {children}
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Type in language to find guide"
          className="input input-bordered w-full pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (searchTerm.trim() && filteredLanguages.length > 0) {
              setShowDropdown(true);
            }
          }}
        />
        <Search className="absolute left-3 top-2/3 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
      </div>

      {/* Dropdown Suggestions */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
          {filteredLanguages.map((language, index) => (
            <div
              key={language.id}
              className={`flex items-center gap-3 p-3 hover:bg-base-200 cursor-pointer border-b border-base-200 last:border-b-0 ${
                selectedIndex === index ? "bg-base-200" : ""
              }`}
              onClick={() =>
                handleDownload(language.code, language.display_name)
              }
            >
              {/* Language Flag */}
              <img
                src={`/langs/${language.code}/${language.code}_flag_50.png`}
                alt={`${language.display_name} flag`}
                className="w-6 h-6 object-cover rounded-sm flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />

              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {language.display_name}
                </div>
                <div className="text-xs text-base-content/60 truncate">
                  {language.language_name}
                </div>
              </div>

              <Download className="w-4 h-4 text-primary flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
