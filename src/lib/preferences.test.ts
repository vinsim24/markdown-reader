import { describe, expect, it } from 'vitest';
import { defaultPreferences, loadPreferences, validatePreferences } from './preferences';

describe('preferences', () => {
  it('accepts valid versioned preferences', () => {
    expect(validatePreferences({ ...defaultPreferences, theme: 'dark', size: 20 }).size).toBe(20);
  });
  it('repairs invalid values and outdated schemas', () => {
    expect(validatePreferences({ ...defaultPreferences, size: 200 }).size).toBe(18);
    expect(validatePreferences({ version: 0, theme: 'dark' })).toEqual(defaultPreferences);
  });
  it('recovers from malformed storage', () => {
    expect(loadPreferences({ getItem: () => '{bad json' })).toEqual(defaultPreferences);
  });
});
