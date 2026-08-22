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
export const themeColors: Record<Theme, CustomColors> = {
  light: { background: '#f7f7f5', text: '#292a2d', accent: '#3d6b5c' },
  dark: { background: '#191b1c', text: '#e7e8e4', accent: '#90c2a5' },
  sepia: { background: '#f2eadb', text: '#493e32', accent: '#9b6846' },
  mono: { background: '#f5f5f3', text: '#222222', accent: '#222222' },
  cappuccino: { background: '#e8ddcf', text: '#44332a', accent: '#9a6043' },
  contrast: { background: '#ffffff', text: '#000000', accent: '#003cff' },
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
  const fontExplicit = input.fontExplicit === true;
  const custom = input.customColors;
  return {
    version: 1,
    theme,
    font: fontExplicit && fonts.has(input.font || '') ? input.font as Font : themeFonts[theme],
    fontExplicit,
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

export function contrastRatio(first: string, second: string) {
  const luminance = (color: string) => {
    const channels = [1, 3, 5]
      .map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16) / 255)
      .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const [bright, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (bright + 0.05) / (dark + 0.05);
}
