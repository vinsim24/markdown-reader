export type Theme = 'light' | 'dark' | 'sepia' | 'mono' | 'cappuccino' | 'contrast';
export type Font = 'inter' | 'source-serif' | 'literata' | 'charter' | 'atkinson' | 'system-sans' | 'jetbrains' | 'system-mono';
export type CodeTheme = 'auto' | 'light' | 'dark';

export interface CustomColors {
  background: string;
  text: string;
  accent: string;
}

export interface ReaderPreferences {
  version: 1;
  theme: Theme;
  font: Font;
  fontExplicit: boolean;
  size: number;
  width: number;
  lineHeight: number;
  codeTheme: CodeTheme;
  customColors?: CustomColors;
}

export const STORAGE_KEY = 'markdown-reader:preferences';
export const themeFonts: Record<Theme, Font> = {
  light: 'inter', dark: 'inter', sepia: 'source-serif', cappuccino: 'source-serif',
  mono: 'jetbrains', contrast: 'atkinson',
};
export const defaultPreferences: ReaderPreferences = {
  version: 1,
  theme: 'light',
  font: 'inter',
  fontExplicit: false,
  size: 18,
  width: 720,
  lineHeight: 1.75,
  codeTheme: 'auto',
};

const themes = new Set(Object.keys(themeFonts));
const fonts = new Set(['inter', 'source-serif', 'literata', 'charter', 'atkinson', 'system-sans', 'jetbrains', 'system-mono']);
const codeThemes = new Set(['auto', 'light', 'dark']);
const colorPattern = /^#[\da-f]{6}$/i;

export function validatePreferences(value: unknown): ReaderPreferences {
  if (!value || typeof value !== 'object') return { ...defaultPreferences };
  const input = value as Partial<ReaderPreferences>;
  if (input.version !== 1) return { ...defaultPreferences };
  const theme = themes.has(input.theme || '') ? input.theme as Theme : defaultPreferences.theme;
  const custom = input.customColors;
  return {
    version: 1,
    theme,
    font: fonts.has(input.font || '') ? input.font as Font : themeFonts[theme],
    fontExplicit: input.fontExplicit === true,
    size: typeof input.size === 'number' && input.size >= 15 && input.size <= 23 ? input.size : 18,
    width: typeof input.width === 'number' && input.width >= 560 && input.width <= 960 ? input.width : 720,
    lineHeight: typeof input.lineHeight === 'number' && input.lineHeight >= 1.35 && input.lineHeight <= 2.1 ? input.lineHeight : 1.75,
    codeTheme: codeThemes.has(input.codeTheme || '') ? input.codeTheme as CodeTheme : 'auto',
    customColors: custom && colorPattern.test(custom.background) && colorPattern.test(custom.text) && colorPattern.test(custom.accent)
      ? custom : undefined,
  };
}

export function loadPreferences(storage: Pick<Storage, 'getItem'> = localStorage) {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    return stored ? validatePreferences(JSON.parse(stored)) : { ...defaultPreferences };
  } catch {
    return { ...defaultPreferences };
  }
}

export function savePreferences(preferences: ReaderPreferences, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

