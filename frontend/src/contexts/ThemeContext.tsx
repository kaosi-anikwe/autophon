import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ThemeSetting = "autophon" | "autophon-dark" | "system";
type ActualTheme = "autophon" | "autophon-dark";

interface ThemeContextType {
  theme: ActualTheme;
  themeSetting: ThemeSetting;
  toggleTheme: () => void;
  setTheme: (theme: ThemeSetting) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const getSystemTheme = (): ActualTheme => {
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "autophon-dark";
    }
    return "autophon";
  };

  const [themeSetting, setThemeSettingState] = useState<ThemeSetting>(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem("theme") as ThemeSetting;
    if (
      savedTheme &&
      (savedTheme === "autophon" || savedTheme === "autophon-dark" || savedTheme === "system")
    ) {
      return savedTheme;
    }

    return "system";
  });

  const [theme, setThemeState] = useState<ActualTheme>(() => {
    if (themeSetting === "system") {
      return getSystemTheme();
    }
    return themeSetting as ActualTheme;
  });

  useEffect(() => {
    // Determine actual theme based on setting
    if (themeSetting === "system") {
      setThemeState(getSystemTheme());
    } else {
      setThemeState(themeSetting as ActualTheme);
    }

    // Save theme setting to localStorage
    localStorage.setItem("theme", themeSetting);
  }, [themeSetting]);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-change if theme setting is "system"
      if (themeSetting === "system") {
        setThemeState(e.matches ? "autophon-dark" : "autophon");
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeSetting]);

  const toggleTheme = () => {
    if (themeSetting === "system") {
      setThemeSettingState(theme === "autophon" ? "autophon-dark" : "autophon");
    } else {
      setThemeSettingState((prev) =>
        prev === "autophon" ? "autophon-dark" : "autophon"
      );
    }
  };

  const setTheme = (newTheme: ThemeSetting) => {
    setThemeSettingState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeSetting, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}