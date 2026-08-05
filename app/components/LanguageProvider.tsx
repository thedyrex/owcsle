"use client";

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { translations, LANG_COOKIE, type Lang } from '@/app/i18n/translations';

type Vars = Record<string, string | number>;

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Vars) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLang(v: string | undefined | null): v is Lang {
  return v === 'en' || v === 'zh' || v === 'ko';
}

function readCookieLang(): Lang | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)owcsle_lang=(en|zh|ko)/);
  return match ? (match[1] as Lang) : null;
}

function interpolate(str: string, vars?: Vars): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (whole, name) =>
    name in vars ? String(vars[name]) : whole
  );
}

export function LanguageProvider({
  initialLang = 'en',
  children,
}: {
  initialLang?: Lang;
  children: React.ReactNode;
}) {
  // Prefer the server-provided cookie value so the first client render matches SSR;
  // fall back to reading the cookie directly (covers client-only navigations).
  const [lang, setLangState] = useState<Lang>(() => readCookieLang() ?? initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
  }, []);

  const t = useCallback(
    (key: string, vars?: Vars): string => {
      const value = translations[lang][key] ?? translations.en[key] ?? key;
      return interpolate(value, vars);
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe fallback if a component renders outside the provider: English, no crash.
    return {
      lang: 'en',
      setLang: () => {},
      t: (key: string, vars?: Vars) => interpolate(translations.en[key] ?? key, vars),
    };
  }
  return ctx;
}

/** Returns the translate function `t(key, vars?)`. */
export function useT() {
  return useLanguage().t;
}

/** Returns `{ lang, setLang }` for reading/changing the current language. */
export function useLang() {
  const { lang, setLang } = useLanguage();
  return { lang, setLang };
}
