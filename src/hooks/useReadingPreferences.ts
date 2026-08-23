import { type CSSProperties, useEffect, useRef, useState } from 'react';
import {
  type CustomColors,
  contrastRatio,
  defaultPreferences,
  loadPreferences,
  savePreferences,
  themeColors,
} from '../lib/preferences';

export function useReadingPreferences() {
  const [preferences, setPreferences] = useState(loadPreferences);
  const skipPreferenceSave = useRef(false);

  useEffect(() => {
    document.body.dataset.theme = preferences.theme;
    document.body.dataset.font = preferences.font;
    if (skipPreferenceSave.current) skipPreferenceSave.current = false;
    else savePreferences(preferences);
  }, [preferences]);

  const selectedColors =
    preferences.customColors || themeColors[preferences.theme];
  const lowContrast =
    contrastRatio(selectedColors.background, selectedColors.text) < 4.5;
  const style = {
    '--reading-size': `${preferences.size}px`,
    '--reading-width': `${preferences.width}px`,
    '--reading-line-height': preferences.lineHeight,
    ...(preferences.customColors
      ? {
          '--bg': preferences.customColors.background,
          '--text': preferences.customColors.text,
          '--accent': preferences.customColors.accent,
        }
      : {}),
  } as CSSProperties;

  const setCustomColor = (key: keyof CustomColors, value: string) => {
    setPreferences((current) => ({
      ...current,
      customColors: {
        ...(current.customColors || themeColors[current.theme]),
        [key]: value,
      },
    }));
  };

  const resetPreferences = () => {
    localStorage.removeItem('markdown-reader:preferences');
    skipPreferenceSave.current = true;
    setPreferences({ ...defaultPreferences });
  };

  return {
    lowContrast,
    preferences,
    resetPreferences,
    selectedColors,
    setCustomColor,
    setPreferences,
    style,
  };
}
