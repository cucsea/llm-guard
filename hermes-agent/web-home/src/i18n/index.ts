import { create } from "zustand";
import { en, type TranslationKey, type Translations } from "./en";
import { zh } from "./zh";

export type Lang = "zh" | "en";

const DICTS: Record<Lang, Translations> = { zh, en };
const STORAGE_KEY = "jizhi.home.lang";

function detectInitial(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "zh" || saved === "en") return saved;
  } catch {
    /* privacy mode — ignore */
  }
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
  }
  return "zh";
}

interface I18nState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useI18nStore = create<I18nState>((set) => ({
  lang: detectInitial(),
  setLang: (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang;
    set({ lang });
  },
}));

export function useT() {
  const lang = useI18nStore((s) => s.lang);
  const dict = DICTS[lang] ?? en;
  return (key: TranslationKey, vars?: Record<string, string | number>) => {
    let out: string = dict[key] ?? en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        out = out.replace(`{${k}}`, String(v));
      }
    }
    return out;
  };
}

export function useLang() {
  return useI18nStore((s) => s.lang);
}
