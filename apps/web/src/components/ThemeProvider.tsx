"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: "light",
  toggleTheme: () => undefined,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("cad-toolbox-theme");
    const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const nextTheme = storedTheme === "dark" || storedTheme === "light"
      ? storedTheme
      : preferredTheme;

    setTheme(nextTheme);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("cad-toolbox-theme", theme);
  }, [hydrated, theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme((value) => value === "light" ? "dark" : "light") }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}