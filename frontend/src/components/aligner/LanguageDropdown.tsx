import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface Language {
  code: string;
  display_name: string;
  language_name: string;
  type: string;
  alphabet: string;
  priority: number;
  homepage: boolean;
}

interface LanguageDropdownProps {
  value: string;
  onChange: (languageCode: string) => void;
  languages: Language[];
  disabled?: boolean;
  onClose?: () => void;
  inline?: boolean;
}

export default function LanguageDropdown({
  value,
  onChange,
  languages,
  disabled = false,
  onClose,
  inline = false,
}: LanguageDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group languages by type
  const groupedLanguages = useMemo(() => {
    const filtered = languages.filter(
      (lang) =>
        lang.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.language_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const nordic = filtered
      .filter((lang) => lang.type === "nordic")
      .slice(0, 6);
    const other = filtered.filter((lang) => lang.type === "other").slice(0, 6);

    return { nordic, other };
  }, [languages, searchTerm]);

  const selectedLanguage = languages.find((lang) => lang.code === value);

  // Flatten languages for keyboard navigation
  const allFilteredLanguages = useMemo(() => {
    return [...groupedLanguages.nordic, ...groupedLanguages.other];
  }, [groupedLanguages]);

  const getLanguageFlag = (languageCode: string) => {
    return `/langs/${languageCode}/${languageCode}_flag_50.png`;
  };

  // Reset selected index when search term changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchTerm]);

  // Keyboard navigation
  useEffect(() => {
    if (!inline || !containerRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!allFilteredLanguages.length) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < allFilteredLanguages.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : allFilteredLanguages.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && allFilteredLanguages[selectedIndex]) {
            onChange(allFilteredLanguages[selectedIndex].language_name);
            setSearchTerm("");
            onClose?.();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose?.();
          break;
      }
    };

    const container = containerRef.current;
    container.addEventListener('keydown', handleKeyDown);
    container.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [allFilteredLanguages, selectedIndex, onChange, onClose, inline]);

  // For inline mode, render just the dropdown content
  if (inline) {
    return (
      <div 
        ref={containerRef}
        className="w-full max-h-80 bg-white border border-base-200 rounded-md shadow-lg p-1 z-[100] outline-none"
        tabIndex={0}
      >
        {/* Search input */}
        <div className="relative p-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search languages..."
            className="w-full pl-8 pr-2 py-1 text-sm border border-base-200 rounded-md focus:outline-none focus:ring-1 focus:ring-secondary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <div className="border-t border-base-200 my-1" />

        {/* All Languages (merged) */}
        {allFilteredLanguages.slice(0, 6).map((language, index) => (
          <div
            key={language.code}
            onClick={() => {
              onChange(language.language_name);
              setSearchTerm("");
              onClose?.();
            }}
            className={`flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 cursor-pointer rounded-sm ${
              selectedIndex === index ? 'bg-blue-100' : ''
            }`}
          >
            <img
              src={getLanguageFlag(language.code)}
              alt={language.language_name}
              className="w-6 h-6 object-cover rounded-sm"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="flex flex-col">
              <span className="text-sm">{language.language_name}</span>
              <span className="text-xs text-gray-500">
                {language.alphabet}
              </span>
            </div>
          </div>
        ))}

        {/* No results */}
        {allFilteredLanguages.length === 0 && (
          <div className="px-2 py-1.5 text-sm text-gray-500">
            No languages found
          </div>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
      >
        {selectedLanguage && (
          <img
            src={getLanguageFlag(selectedLanguage.code)}
            alt={selectedLanguage.language_name}
            className="w-6 h-6 object-cover rounded-sm"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <span className="text-sm truncate">
          {selectedLanguage ? selectedLanguage.language_name : value}
        </span>
        <ChevronDown className="w-3 h-3 ml-auto" />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-full max-h-80">
        {/* Search input */}
        <div className="relative p-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search languages..."
            className="w-full pl-8 pr-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <DropdownMenuSeparator />

        {/* Nordic Languages */}
        {groupedLanguages.nordic.length > 0 && (
          <>
            <DropdownMenuLabel>Nordic Languages</DropdownMenuLabel>
            {groupedLanguages.nordic.map((language) => (
              <DropdownMenuItem
                key={language.code}
                onClick={() => {
                  onChange(language.language_name);
                  setOpen(false);
                  setSearchTerm("");
                }}
                className="flex items-center gap-2"
              >
                <img
                  src={getLanguageFlag(language.code)}
                  alt={language.language_name}
                  className="w-6 h-6 object-cover rounded-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-sm">{language.language_name}</span>
                  <span className="text-xs text-gray-500">
                    {language.alphabet}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        {/* Other Languages */}
        {groupedLanguages.other.length > 0 && (
          <>
            <DropdownMenuLabel>Other Languages</DropdownMenuLabel>
            {groupedLanguages.other.map((language) => (
              <DropdownMenuItem
                key={language.code}
                onClick={() => {
                  onChange(language.language_name);
                  setOpen(false);
                  setSearchTerm("");
                }}
                className="flex items-center gap-2"
              >
                <img
                  src={getLanguageFlag(language.code)}
                  alt={language.language_name}
                  className="w-6 h-6 object-cover rounded-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-sm">{language.language_name}</span>
                  <span className="text-xs text-gray-500">
                    {language.alphabet}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* No results */}
        {groupedLanguages.nordic.length === 0 &&
          groupedLanguages.other.length === 0 && (
            <DropdownMenuItem disabled>No languages found</DropdownMenuItem>
          )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
