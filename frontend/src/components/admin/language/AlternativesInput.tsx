import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ChevronDown } from "lucide-react";
import { adminLanguagesAPI } from "@/lib/api";

interface AlternativesInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  excludeCode?: string; // Exclude current language code from suggestions
}

export default function AlternativesInput({
  value,
  onChange,
  placeholder = "e.g., eng, fra, deu (comma-separated)",
  className = "",
  excludeCode,
}: AlternativesInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedAlternatives, setSelectedAlternatives] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get all languages for autocomplete
  const { data: languagesData } = useQuery({
    queryKey: ["adminLanguages"],
    queryFn: () => adminLanguagesAPI.getLanguages(),
  });

  const availableCodes = languagesData?.languages
    ?.map((lang) => lang.code)
    .filter((code) => code !== excludeCode) // Exclude current language
    .sort() || [];

  // Initialize from value prop
  useEffect(() => {
    const alternatives = value
      .split(",")
      .map((alt) => alt.trim())
      .filter(Boolean);
    setSelectedAlternatives(alternatives);
  }, [value]);

  // Update filtered suggestions based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = availableCodes.filter((code) =>
        code.toLowerCase().includes(inputValue.toLowerCase()) &&
        !selectedAlternatives.includes(code)
      );
      setFilteredSuggestions(filtered);
      setHighlightedIndex(-1);
    } else {
      setFilteredSuggestions([]);
    }
  }, [inputValue, availableCodes, selectedAlternatives]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateValue = (alternatives: string[]) => {
    const newValue = alternatives.join(", ");
    onChange(newValue);
    setSelectedAlternatives(alternatives);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInputValue = e.target.value;
    setInputValue(newInputValue);
    setShowSuggestions(true);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        addAlternative(filteredSuggestions[highlightedIndex]);
      } else if (inputValue.trim() && e.key === "Enter") {
        // Allow manual entry if pressed Enter
        addAlternative(inputValue.trim());
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    } else if (e.key === "Backspace" && !inputValue && selectedAlternatives.length > 0) {
      // Remove last alternative if backspace on empty input
      removeAlternative(selectedAlternatives.length - 1);
    }
  };

  const addAlternative = (code: string) => {
    if (code && !selectedAlternatives.includes(code)) {
      const newAlternatives = [...selectedAlternatives, code];
      updateValue(newAlternatives);
    }
    setInputValue("");
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const removeAlternative = (index: number) => {
    const newAlternatives = selectedAlternatives.filter((_, i) => i !== index);
    updateValue(newAlternatives);
  };

  const handleSuggestionClick = (code: string) => {
    addAlternative(code);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className={`input input-bordered flex flex-wrap items-center gap-1 p-2 min-h-[3rem] ${className}`}>
        {/* Selected alternatives as badges */}
        {selectedAlternatives.map((alt, index) => (
          <span
            key={alt}
            className="badge badge-primary gap-2 text-xs font-mono"
          >
            {alt}
            <button
              type="button"
              onClick={() => removeAlternative(index)}
              className="hover:text-error"
              aria-label={`Remove ${alt}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        
        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={handleInputFocus}
          placeholder={selectedAlternatives.length === 0 ? placeholder : "Type to add more..."}
          className="flex-1 min-w-[120px] bg-transparent outline-none border-none text-sm"
        />
        
        {/* Dropdown indicator */}
        {availableCodes.length > 0 && (
          <ChevronDown className="w-4 h-4 text-base-content/40" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredSuggestions.map((code, index) => (
            <button
              key={code}
              type="button"
              className={`w-full px-3 py-2 text-left text-sm hover:bg-base-200 font-mono ${
                index === highlightedIndex ? "bg-base-200" : ""
              }`}
              onClick={() => handleSuggestionClick(code)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {code}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}