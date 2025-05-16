import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { Preferences } from '@capacitor/preferences';

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: async () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const { value } = await Preferences.get({ key: storageKey });
        if (value) {
          setTheme(value as Theme);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };
    
    loadTheme();
  }, [storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: async (theme: Theme) => {
      setTheme(theme);
      try {
        await Preferences.set({ key: storageKey, value: theme });
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};