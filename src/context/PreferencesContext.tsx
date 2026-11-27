import React, { createContext, useContext, useEffect, useState } from 'react';

interface UserPreferences {
  defaultLanguage: string;
  autosaveEnabled: boolean;
}

interface PreferencesContextValue extends UserPreferences {
  setDefaultLanguage: (lang: string) => void;
  setAutosaveEnabled: (enabled: boolean) => void;
}

const PREFS_STORAGE_KEY = 'tb_user_preferences_v1';

const PreferencesContext = createContext<PreferencesContextValue>({
  defaultLanguage: 'en',
  autosaveEnabled: true,
  setDefaultLanguage: () => {},
  setAutosaveEnabled: () => {},
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<UserPreferences>(() => {
    try {
      const raw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserPreferences>;
        return {
          defaultLanguage: typeof parsed.defaultLanguage === 'string' ? parsed.defaultLanguage : 'en',
          autosaveEnabled: typeof parsed.autosaveEnabled === 'boolean' ? parsed.autosaveEnabled : true,
        };
      }
    } catch {
      // ignore
    }
    return { defaultLanguage: 'en', autosaveEnabled: true };
  });

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [prefs]);

  const setDefaultLanguage = (lang: string) =>
    setPrefs((prev) => ({ ...prev, defaultLanguage: lang }));

  const setAutosaveEnabled = (enabled: boolean) =>
    setPrefs((prev) => ({ ...prev, autosaveEnabled: enabled }));

  return (
    <PreferencesContext.Provider
      value={{
        defaultLanguage: prefs.defaultLanguage,
        autosaveEnabled: prefs.autosaveEnabled,
        setDefaultLanguage,
        setAutosaveEnabled,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
