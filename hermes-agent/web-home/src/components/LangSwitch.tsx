import { Languages } from "lucide-react";
import { useI18nStore, type Lang } from "@/i18n";

export function LangSwitch() {
  const lang = useI18nStore((s) => s.lang);
  const setLang = useI18nStore((s) => s.setLang);
  const next: Lang = lang === "zh" ? "en" : "zh";
  return (
    <button
      onClick={() => setLang(next)}
      title={lang === "zh" ? "Switch to English" : "切换为中文"}
      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-[var(--sidebar-fg)] transition hover:bg-white/10 hover:text-white"
    >
      <Languages className="h-3.5 w-3.5" />
      <span>{lang === "zh" ? "中" : "EN"}</span>
    </button>
  );
}
