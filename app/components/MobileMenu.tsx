"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Menu,
  HelpCircle,
  BarChart3,
  Crown,
  Infinity as InfinityIcon,
  Home as HomeIcon,
  MessageCircle,
  Settings,
  UserCircle,
  LucideIcon,
} from "lucide-react";
import { UserMenu } from "./UserMenu";

interface MobileMenuProps {
  isArcade: boolean;
  user: User | null;
  onHowToPlay: () => void;
  onStats: () => void;
  onLeaderboard: () => void;
  onToggleArcade: () => void;
  onUsa: () => void;
  onFeedback: () => void;
  onSettings: () => void;
  onLoginClick: () => void;
}

export function MobileMenu({
  isArcade,
  user,
  onHowToPlay,
  onStats,
  onLeaderboard,
  onToggleArcade,
  onUsa,
  onFeedback,
  onSettings,
  onLoginClick,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
    }, 200);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".mobile-menu")) close();
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (open) {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open, close]);

  const runAndClose = (fn: () => void) => {
    fn();
    close();
  };

  const Row = ({
    icon: Icon,
    label,
    onClick,
  }: {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
  }) => (
    <button
      onClick={() => runAndClose(onClick)}
      className="w-full px-4 py-2.5 flex items-center gap-3 text-neutral-900 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="font-[family-name:var(--font-ow-esports)] text-sm">{label}</span>
    </button>
  );

  return (
    <div className="mobile-menu relative flex sm:hidden z-[110]">
      <button
        aria-label="Menu"
        onClick={() => (open ? close() : setOpen(true))}
        className="p-2 rounded-lg text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 shadow-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Always mounted so the profile modal survives the dropdown closing */}
      <div
        ref={userMenuRef}
        aria-hidden
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}
      >
        <UserMenu user={user} onLoginClick={onLoginClick} />
      </div>

      {open && (
        <div
          className={`absolute top-full right-0 mt-2 w-56 bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden z-[9999] ${
            isClosing ? "animate-dropdown-close" : "animate-dropdown"
          }`}
        >
          <Row icon={HelpCircle} label="How to play" onClick={onHowToPlay} />
          {!isArcade && <Row icon={BarChart3} label="Statistics" onClick={onStats} />}
          {isArcade && <Row icon={Crown} label="Leaderboard" onClick={onLeaderboard} />}
          <Row
            icon={isArcade ? HomeIcon : InfinityIcon}
            label={isArcade ? "Daily" : "Unlimited"}
            onClick={onToggleArcade}
          />
          <button
            onClick={() => runAndClose(onUsa)}
            className="w-full px-4 py-2.5 flex items-center gap-3 text-neutral-900 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
          >
            <img
              src="https://cdn.owcsle.xyz/images/usa_logo.png"
              alt="USA OWWC"
              className="w-4 h-4 object-contain shrink-0 dark:invert"
            />
            <span className="font-[family-name:var(--font-ow-esports)] text-sm">USA OWWC</span>
          </button>
          <Row icon={MessageCircle} label="Feedback" onClick={onFeedback} />

          <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-1" />

          <Row icon={Settings} label="Settings" onClick={onSettings} />

          <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-1" />

          {/* Account — triggers the always-mounted UserMenu (login / profile modal) */}
          <Row
            icon={UserCircle}
            label={user ? "Profile" : "Log in"}
            onClick={() => userMenuRef.current?.querySelector("button")?.click()}
          />
        </div>
      )}
    </div>
  );
}
