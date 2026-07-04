"use client";

import { useState } from "react";

interface ImageIconButtonProps {
  src: string;
  label: string;
  onClick: () => void;
  className?: string;
  imgClassName?: string;
}

export function ImageIconButton({ src, label, onClick, className = "", imgClassName = "" }: ImageIconButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={() => setShowTooltip(true)}
        onTouchEnd={() => setTimeout(() => setShowTooltip(false), 1500)}
        className={`p-2 rounded-lg text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${className}`}
      >
        <img src={src} alt={label} onContextMenu={(e) => e.preventDefault()} className={`w-5 h-5 object-contain ${imgClassName}`} />
      </button>
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
