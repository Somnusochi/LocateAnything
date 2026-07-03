import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore } from "@/store/useAppStore";

const LANG_KEYS = ["zh", "en", "ja"] as const;
const LANG_LABELS: Record<string, string> = { zh: "中", en: "EN", ja: "日" };
const LANG_TITLES: Record<string, string> = { zh: "中文", en: "English", ja: "日本語" };

const WORKSPACES = [
  { to: "/annotate", labelKey: "common.annotate" },
  { to: "/validate", labelKey: "common.validate" },
  { to: "/records", labelKey: "common.history" },
  { to: "/training", labelKey: "common.yoloTrain" },
] as const;

export function Layout() {
  const { t, i18n } = useTranslation();
  const { themeMode, setThemeMode } = useTheme();
  const navigate = useNavigate();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isLoading = isFetching > 0 || isMutating > 0;

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ jobId?: string }>).detail;
      if (!detail?.jobId) return;
      useAppStore.setState({
        appMode: "validate",
        validateModelSource: "trained",
        selectedTrainedJobId: detail.jobId,
      });
      navigate("/validate");
    };
    window.addEventListener("yolo-validate", handler);
    return () => window.removeEventListener("yolo-validate", handler);
  }, [navigate]);

  return (
    <div className="flex h-screen flex-col bg-gray-50 relative">
      {isLoading && (
        <div className="absolute top-0 left-0 w-full h-[3px] z-[9999] overflow-hidden bg-primary-100 dark:bg-primary-900/50">
          <div className="h-full bg-primary-600 dark:bg-primary-500 w-1/3 animate-[slideRight_1.5s_infinite_linear]" />
        </div>
      )}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 overflow-x-auto border-b border-gray-200 bg-white px-4">
        <div className="flex min-w-0 items-center gap-5">
          <span className="shrink-0 text-xs font-bold text-gray-400 tracking-wider">
            VLM-AutoYOLO
          </span>
          <nav className="flex shrink-0 items-center gap-1 rounded-lg bg-gray-100/80 p-1">
            {WORKSPACES.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-white text-primary-600 shadow-sm"
                      : "text-gray-500 hover:bg-gray-200/70 hover:text-gray-700"
                  }`
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 gap-1.5 items-center">
          <div className="flex rounded border border-gray-200 bg-gray-50 overflow-hidden h-7">
            {(["light", "dark", "system"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setThemeMode(mode)}
                className={`flex items-center justify-center w-7 transition-colors cursor-pointer ${
                  themeMode === mode
                    ? "bg-primary-500 text-white"
                    : "text-gray-500 hover:text-primary-600 hover:bg-gray-100"
                }`}
                title={t(`common.theme${mode.charAt(0).toUpperCase() + mode.slice(1)}` as never)}
              >
                <ThemeIcon mode={mode} />
              </button>
            ))}
          </div>

          <div className="flex rounded border border-gray-200 bg-gray-50 overflow-hidden h-7">
            {LANG_KEYS.map((lang) => {
              const active = i18n.language.startsWith(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => i18n.changeLanguage(lang)}
                  className={`text-[10px] font-semibold px-1.5 transition-colors cursor-pointer ${
                    active
                      ? "bg-primary-500 text-white"
                      : "text-gray-500 hover:text-primary-600 hover:bg-gray-100"
                  }`}
                  title={LANG_TITLES[lang]}
                >
                  {LANG_LABELS[lang]}
                </button>
              );
            })}
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

function ThemeIcon({ mode }: { mode: "light" | "dark" | "system" }) {
  if (mode === "light") {
    return (
      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    );
  }
  if (mode === "dark") {
    return (
      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    );
  }
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
