"use client";

import { useState } from "react";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface IconLinkProps {
  icon: LucideIcon;
  label: string;
  href: string;
  className?: string;
}

export function IconLink({ icon: Icon, label, href, className = "" }: IconLinkProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative group">
      <Link
        href={href}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={() => setShowTooltip(true)}
        onTouchEnd={() => setTimeout(() => setShowTooltip(false), 1500)}
        className={`p-2 rounded-lg text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer block ${className}`}
      >
        <Icon className="w-5 h-5" />
      </Link>
      <div
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 dark:bg-neutral-700 text-white text-xs rounded whitespace-nowrap transition-opacity pointer-events-none z-[200] font-[family-name:var(--font-ow-esports)] ${
          showTooltip ? "opacity-100" : "opacity-0"
        }`}
      >
        {label}
      </div>
    </div>
  );
}
