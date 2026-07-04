"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useCallback } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 200);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".theme-toggle")) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  const handleThemeSwitch = (newTheme: string) => {
    // Check if browser supports View Transitions API
    if ((document as any).startViewTransition && newTheme !== theme) {
      // Set the animation style to "angled"
      document.documentElement.dataset.style = "angled";

      // Start the view transition
      (document as any).startViewTransition(() => {
        setTheme(newTheme);
      });
    } else {
      setTheme(newTheme);
    }
    closeDropdown();
  };

  if (!mounted) {
    return null;
  }

  const getIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="w-5 h-5" />;
      case "dark":
        return <Moon className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  return (
    <div className="relative theme-toggle">
      <button
        onClick={() => { setShowTooltip(false); isOpen ? closeDropdown() : setIsOpen(true); }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="p-2 rounded-lg text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
      >
        {getIcon()}
      </button>
      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 dark:bg-neutral-700 text-white text-xs rounded whitespace-nowrap transition-opacity pointer-events-none z-[200] font-[family-name:var(--font-ow-esports)] ${showTooltip && !isOpen ? 'opacity-100' : 'opacity-0'}`}>
        Theme
      </div>

      {isOpen && (
        <div className={`absolute top-full mt-2 right-0 bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden min-w-[140px] z-[9999] ${isClosing ? 'animate-dropdown-close' : 'animate-dropdown'}`}>
          <button
            onClick={() => handleThemeSwitch("light")}
            className={`w-full px-4 py-2 flex items-center gap-3 transition-all group cursor-pointer ${
              theme === "light" ? "bg-orange-500/20 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400" : "hover:bg-neutral-100 dark:hover:bg-neutral-800/50 text-neutral-900 dark:text-neutral-200"
            }`}
          >
            <Sun className={`w-4 h-4 transition-transform ${theme !== "light" ? "group-hover:scale-110" : ""}`} />
            <span className="font-[family-name:var(--font-ow-esports)]">Light</span>
          </button>
          <button
            onClick={() => handleThemeSwitch("dark")}
            className={`w-full px-4 py-2 flex items-center gap-3 transition-all group cursor-pointer ${
              theme === "dark" ? "bg-orange-500/20 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400" : "hover:bg-neutral-100 dark:hover:bg-neutral-800/50 text-neutral-900 dark:text-neutral-200"
            }`}
          >
            <Moon className={`w-4 h-4 transition-transform ${theme !== "dark" ? "group-hover:scale-110" : ""}`} />
            <span className="font-[family-name:var(--font-ow-esports)]">Dark</span>
          </button>
          <button
            onClick={() => handleThemeSwitch("system")}
            className={`w-full px-4 py-2 flex items-center gap-3 transition-all group cursor-pointer ${
              theme === "system" ? "bg-orange-500/20 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400" : "hover:bg-neutral-100 dark:hover:bg-neutral-800/50 text-neutral-900 dark:text-neutral-200"
            }`}
          >
            <Monitor className={`w-4 h-4 transition-transform ${theme !== "system" ? "group-hover:scale-110" : ""}`} />
            <span className="font-[family-name:var(--font-ow-esports)]">System</span>
          </button>
        </div>
      )}
    </div>
  );
}
