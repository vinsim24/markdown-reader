import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  defaultPreferences,
  loadPreferences,
  validatePreferences,
} from './preferences';

describe('preferences', () => {
  it('accepts valid versioned preferences', () => {
    expect(
      validatePreferences({ ...defaultPreferences, theme: 'dark', size: 20 })
        .size
    ).toBe(20);
  });
  it('repairs invalid values and outdated schemas', () => {
    expect(validatePreferences({ ...defaultPreferences, size: 200 }).size).toBe(
      18
    );
    expect(validatePreferences({ version: 0, theme: 'dark' })).toEqual(
      defaultPreferences
    );
  });
  it('applies theme fonts unless the user explicitly chose a font', () => {
    expect(
      validatePreferences({
        ...defaultPreferences,
        theme: 'mono',
        font: 'inter',
      }).font
    ).toBe('jetbrains');
    expect(
      validatePreferences({
        ...defaultPreferences,
        theme: 'mono',
        font: 'literata',
        fontExplicit: true,
      }).font
    ).toBe('literata');
  });
  it('recovers from malformed storage', () => {
    expect(loadPreferences({ getItem: () => '{bad json' })).toEqual(
      defaultPreferences
    );
  });
  it('calculates readable color contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.5);
  });
});
