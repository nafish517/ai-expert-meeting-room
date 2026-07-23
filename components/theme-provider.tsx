"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ThemeContextValue = {
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean | ((current: boolean) => boolean)) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("thinkroom-theme");
    const timer = window.setTimeout(() => {
      setIsDarkMode(
        savedTheme
          ? savedTheme === "dark"
          : window.matchMedia("(prefers-color-scheme: dark)").matches,
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const persistTheme = useCallback(
    (value: boolean | ((current: boolean) => boolean)) => {
      setIsDarkMode((current) => {
        const next = typeof value === "function" ? value(current) : value;
        localStorage.setItem("thinkroom-theme", next ? "dark" : "light");
        return next;
      });
    },
    [],
  );

  const toggleTheme = useCallback(() => {
    persistTheme((current) => !current);
  }, [persistTheme]);

  const value = useMemo(
    () => ({
      isDarkMode,
      setIsDarkMode: persistTheme,
      toggleTheme,
    }),
    [isDarkMode, persistTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
