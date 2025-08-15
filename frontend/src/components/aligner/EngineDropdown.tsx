import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Engine } from "@/types/api";

interface EngineDropdownProps {
  value: string;
  onChange: (engineCode: string) => void;
  engines: Engine[];
  disabled?: boolean;
  onClose?: () => void;
  inline?: boolean;
}

export default function EngineDropdown({
  value,
  onChange,
  engines,
  disabled = false,
  onClose,
  inline = false,
}: EngineDropdownProps) {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedEngine = engines.find((engine) => engine.code === value);

  const getEngineIcon = (engineCode: string) => {
    console.log("getting icon", engineCode);
    return `/ngins/${engineCode}.png`;
  };

  // Keyboard navigation for inline mode
  useEffect(() => {
    if (!inline || !containerRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engines.length) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < engines.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : engines.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && engines[selectedIndex]) {
            onChange(engines[selectedIndex].code);
            onClose?.();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose?.();
          break;
      }
    };

    const container = containerRef.current;
    container.addEventListener("keydown", handleKeyDown);
    container.focus();

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, [engines, selectedIndex, onChange, onClose, inline]);

  // For inline mode, render just the dropdown content
  if (inline) {
    return (
      <div
        ref={containerRef}
        className="w-full max-h-80 bg-white border border-base-200 rounded-md shadow-lg p-1 z-[100] outline-none"
        tabIndex={0}
      >
        {engines.map((engine, index) => (
          <div
            key={engine.id}
            onClick={() => {
              onChange(engine.code);
              onClose?.();
            }}
            className={`flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 cursor-pointer rounded-sm ${
              selectedIndex === index ? "bg-blue-100" : ""
            }`}
          >
            <img
              src={getEngineIcon(engine.code)}
              alt={engine.name}
              className="w-6 h-6 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{engine.code}</span>
              <span className="text-xs text-gray-500">{engine.name}</span>
            </div>
          </div>
        ))}

        {engines.length === 0 && (
          <div className="px-2 py-1.5 text-sm text-gray-500">
            No engines available
          </div>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md min-w-[100px] disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
      >
        {selectedEngine && (
          <img
            src={getEngineIcon(selectedEngine.code)}
            alt={selectedEngine.name}
            className="w-6 h-6 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <span className="text-sm truncate">
          {selectedEngine ? selectedEngine.code : value}
        </span>
        <ChevronDown className="w-3 h-3 ml-auto" />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56">
        {engines.map((engine) => (
          <DropdownMenuItem
            key={engine.id}
            onClick={() => {
              onChange(engine.code);
              setOpen(false);
            }}
            className="flex items-center gap-2"
          >
            <img
              src={getEngineIcon(engine.code)}
              alt={engine.name}
              className="w-6 h-6 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{engine.code}</span>
              <span className="text-xs text-gray-500">{engine.name}</span>
            </div>
          </DropdownMenuItem>
        ))}

        {engines.length === 0 && (
          <DropdownMenuItem disabled>No engines available</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
