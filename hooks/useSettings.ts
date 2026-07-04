"use client";

import { useState, useEffect } from 'react';

const SETTINGS_KEY = 'owcsle_settings';

export type ColorblindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';

interface Settings {
  colorblindMode: ColorblindMode;
  reduceMotion: boolean;
}

const defaultSettings: Settings = { colorblindMode: 'none', reduceMotion: false };

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) setSettings({ ...defaultSettings, ...JSON.parse(saved) });
    } catch {}
  }, []);

  const update = (patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return { settings, update };
}
