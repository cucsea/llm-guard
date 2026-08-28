import { NavLink, Outlet } from "react-router-dom";
import {
  MessageSquare,
  History,
  Cpu,
  Sparkles,
  Puzzle,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/i18n";
import type { TranslationKey } from "@/i18n/en";
import { LangSwitch } from "./LangSwitch";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { to: "/chat", labelKey: "nav.chat", icon: MessageSquare },
  { to: "/sessions", labelKey: "nav.sessions", icon: History },
  { to: "/models", labelKey: "nav.models", icon: Cpu },
  { to: "/skills", labelKey: "nav.skills", icon: Sparkles },
  { to: "/plugins", labelKey: "nav.plugins", icon: Puzzle },
  { to: "/config", labelKey: "nav.config", icon: Settings },
];

export function Layout() {
  const t = useT();
  return (
    <div className="flex h-full w-full overflow-hidden">
      <aside
        className="flex w-60 shrink-0 flex-col"
        style={{
          background:
            "linear-gradient(160deg, #0a2a6b 0%, #0b3d8c 45%, #0864b4 100%)",
          color: "var(--sidebar-fg)",
        }}
      >
        <div className="flex flex-col items-center px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
              <img src="/favicon.png" alt="" className="h-full w-full object-cover" />
            </div>
            <div className="whitespace-nowrap text-4xl font-semibold text-[#ff1a1a]"
              style={{ fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif' }}>
              {t("app.name")}
            </div>
          </div>
          <div className="mt-1 whitespace-nowrap text-[18px] uppercase tracking-widest text-white"
            style={{ fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif' }}>
            {t("app.tagline")}
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-3 py-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[1.3125rem] font-medium transition",
                  isActive
                    ? "bg-white/20 text-white font-bold"
                    : "text-[var(--sidebar-fg)] hover:bg-white/5 hover:text-white",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className="h-4 w-0.5 rounded-full transition"
                    style={{
                      background: isActive
                        ? "var(--sidebar-active)"
                        : "transparent",
                    }}
                  />
                  <item.icon className="h-4 w-4" />
                  <span>{t(item.labelKey)}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-between border-t border-white/10 px-4 py-4">
          <span className="text-[10px] text-[var(--fg-subtle)]">v1.01</span>
          <LangSwitch />
        </div>
      </aside>

      <main className="tech-grid flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
