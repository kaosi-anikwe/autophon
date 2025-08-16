import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

// Dropdown style theme selector
export function ThemeDropdown({ className = "" }: { className?: string }) {
  const { theme, themeSetting, setTheme } = useTheme();

  const getDisplayIcon = () => {
    if (themeSetting === "system") {
      return <Monitor className="w-5 h-5" />;
    }
    return theme === "autophon" ? (
      <Sun className="w-5 h-5" />
    ) : (
      <Moon className="w-5 h-5" />
    );
  };

  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
        {getDisplayIcon()}
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-36"
      >
        <li>
          <button
            onClick={() => setTheme("autophon")}
            className={themeSetting === "autophon" ? "active" : ""}
          >
            <Sun className="w-4 h-4" />
            Light
          </button>
        </li>
        <li>
          <button
            onClick={() => setTheme("autophon-dark")}
            className={themeSetting === "autophon-dark" ? "active" : ""}
          >
            <Moon className="w-4 h-4" />
            Dark
          </button>
        </li>
        <li>
          <button
            onClick={() => setTheme("system")}
            className={themeSetting === "system" ? "active" : ""}
          >
            <Monitor className="w-4 h-4" />
            System
          </button>
        </li>
      </ul>
    </div>
  );
}
