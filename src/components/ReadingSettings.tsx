import { XIcon as X } from '@phosphor-icons/react/X';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import {
  type CustomColors,
  type Font,
  type ReaderPreferences,
  type Theme,
  themeFonts,
} from '../lib/preferences';

const themes: {
  key: Theme;
  label: string;
  description: string;
  swatch: string;
}[] = [
  {
    key: 'light',
    label: 'Light',
    description: 'Crisp neutral paper',
    swatch: 'light-swatch',
  },
  {
    key: 'dark',
    label: 'Dark',
    description: 'Low-glare charcoal',
    swatch: 'dark-swatch',
  },
  {
    key: 'sepia',
    label: 'Sepia',
    description: 'Warm reading paper',
    swatch: 'sepia-swatch',
  },
  {
    key: 'cappuccino',
    label: 'Cappuccino',
    description: 'Rich literary warmth',
    swatch: 'cappuccino-swatch',
  },
  {
    key: 'mono',
    label: 'Mono',
    description: 'Focused monochrome',
    swatch: 'mono-swatch',
  },
  {
    key: 'contrast',
    label: 'High Contrast',
    description: 'Maximum definition',
    swatch: 'contrast-swatch',
  },
];

interface ReadingSettingsProps {
  lowContrast: boolean;
  onClose: () => void;
  onResetAll: () => void;
  onSetCustomColor: (key: keyof CustomColors, value: string) => void;
  panelRef: RefObject<HTMLElement | null>;
  preferences: ReaderPreferences;
  selectedColors: CustomColors;
  setPreferences: Dispatch<SetStateAction<ReaderPreferences>>;
}

export default function ReadingSettings({
  lowContrast,
  onClose,
  onResetAll,
  onSetCustomColor,
  panelRef,
  preferences,
  selectedColors,
  setPreferences,
}: ReadingSettingsProps) {
  return (
    <section
      ref={panelRef}
      id="reading-settings"
      className="settings-panel open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="settings-header">
        <div>
          <h2 id="settings-title">Reading settings</h2>
          <p>Adjust the page without changing your document.</p>
        </div>
        <button
          type="button"
          className="close-button"
          onClick={onClose}
          aria-label="Close reading settings"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="settings-section">
        <div className="settings-section-heading">
          <h3>Appearance</h3>
          <p>Choose a complete reading palette.</p>
        </div>
        <div className="setting-group">
          <span className="setting-label">Theme</span>
          <div className="theme-grid">
            {themes.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`theme-choice ${preferences.theme === item.key ? 'active' : ''}`}
                aria-label={item.label}
                aria-pressed={preferences.theme === item.key}
                onClick={() =>
                  setPreferences((current) => ({
                    ...current,
                    theme: item.key,
                    font: current.fontExplicit
                      ? current.font
                      : themeFonts[item.key],
                    customColors: undefined,
                  }))
                }
              >
                <i className={`swatch ${item.swatch}`} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
        <fieldset className="setting-group color-controls">
          <legend>Custom colors</legend>
          {(
            [
              ['background', 'Background'],
              ['text', 'Text'],
              ['accent', 'Accent and links'],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                type="color"
                value={selectedColors[key]}
                onChange={(event) => onSetCustomColor(key, event.target.value)}
              />
            </label>
          ))}
          {lowContrast && (
            <p className="contrast-warning" role="alert">
              Background and text contrast is below the recommended 4.5:1 ratio.
            </p>
          )}
          <button
            type="button"
            className="reset-button compact"
            onClick={() =>
              setPreferences((current) => ({
                ...current,
                font: themeFonts[current.theme],
                fontExplicit: false,
                codeTheme: 'auto',
                customColors: undefined,
              }))
            }
          >
            Reset theme defaults
          </button>
        </fieldset>
      </div>
      <div className="settings-section">
        <div className="settings-section-heading">
          <h3>Typography</h3>
          <p>Set the typeface and reading rhythm.</p>
        </div>
        <div className="setting-group">
          <label htmlFor="reader-font">Font</label>
          <select
            id="reader-font"
            value={preferences.font}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                font: event.target.value as Font,
                fontExplicit: true,
              }))
            }
          >
            <option value="inter">Inter</option>
            <option value="source-serif">Source Serif 4</option>
            <option value="literata">Literata</option>
            <option value="charter">Charter</option>
            <option value="atkinson">Atkinson Hyperlegible</option>
            <option value="system-sans">System Sans</option>
            <option value="jetbrains">JetBrains Mono</option>
            <option value="system-mono">System Mono</option>
          </select>
        </div>
        <div className="setting-group">
          <div className="range-label">
            <label htmlFor="text-size">Text size</label>
            <span>{preferences.size}px</span>
          </div>
          <input
            type="range"
            id="text-size"
            min="15"
            max="23"
            value={preferences.size}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                size: Number(event.target.value),
              }))
            }
          />
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-section-heading">
          <h3>Layout</h3>
          <p>Control the measure and code presentation.</p>
        </div>
        <div className="setting-group">
          <div className="range-label">
            <label htmlFor="reading-width">Reading width</label>
            <span>{preferences.width}px</span>
          </div>
          <input
            type="range"
            id="reading-width"
            min="600"
            max="900"
            value={preferences.width}
            step="20"
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                width: Number(event.target.value),
              }))
            }
          />
        </div>
        <div className="setting-group">
          <div className="range-label">
            <label htmlFor="line-height">Line height</label>
            <span>{preferences.lineHeight.toFixed(2)}</span>
          </div>
          <input
            id="line-height"
            type="range"
            min="1.35"
            max="2.1"
            step="0.05"
            value={preferences.lineHeight}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                lineHeight: Number(event.target.value),
              }))
            }
          />
        </div>
        <div className="setting-group">
          <label htmlFor="code-theme">Code-block theme</label>
          <select
            id="code-theme"
            value={preferences.codeTheme}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                codeTheme: event.target.value as 'auto' | 'light' | 'dark',
              }))
            }
          >
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
      <button type="button" className="reset-button" onClick={onResetAll}>
        Reset all preferences
      </button>
    </section>
  );
}
