import { describe, expect, it } from 'vitest';
import { normalizePath, resolveMarkdownTarget } from './paths';

const files = new Set([
  'README.md',
  'guide/chapter 02.md',
  'guide/chapter03.markdown',
  'guide/folder/README.md',
  'guide/other/index.md',
]);

describe('normalizePath', () => {
  it('normalizes POSIX and Windows separators and dot segments', () => {
    expect(normalizePath('guide/./one/../two.md')).toBe('guide/two.md');
    expect(normalizePath('guide\\one\\..\\two.md')).toBe('guide/two.md');
  });
  it('prevents traversal above the root', () => {
    expect(normalizePath('../secret.md')).toBeNull();
  });
});

describe('resolveMarkdownTarget', () => {
  it('resolves same-document anchors', () => {
    expect(
      resolveMarkdownTarget('#section', 'guide/chapter 02.md', files)
    ).toEqual({
      path: 'guide/chapter 02.md',
      query: '',
      anchor: 'section',
    });
  });
  it('resolves extensionless and encoded paths', () => {
    expect(
      resolveMarkdownTarget('./chapter%2002', 'guide/chapter03.markdown', files)
        ?.path
    ).toBe('guide/chapter 02.md');
    expect(
      resolveMarkdownTarget('chapter03', 'guide/chapter 02.md', files)?.path
    ).toBe('guide/chapter03.markdown');
  });
  it('resolves parent paths and directory fallbacks', () => {
    expect(
      resolveMarkdownTarget('../README.md', 'guide/chapter 02.md', files)?.path
    ).toBe('README.md');
    expect(
      resolveMarkdownTarget('folder/', 'guide/chapter 02.md', files)?.path
    ).toBe('guide/folder/README.md');
    expect(
      resolveMarkdownTarget('other/', 'guide/chapter 02.md', files)?.path
    ).toBe('guide/other/index.md');
  });
  it('preserves query strings and anchors', () => {
    expect(
      resolveMarkdownTarget(
        'chapter03.markdown?view=full#requirements',
        'guide/chapter 02.md',
        files
      )
    ).toEqual({
      path: 'guide/chapter03.markdown',
      query: 'view=full',
      anchor: 'requirements',
    });
  });
  it('returns null for missing and escaping targets', () => {
    expect(
      resolveMarkdownTarget('missing', 'guide/chapter 02.md', files)
    ).toBeNull();
    expect(
      resolveMarkdownTarget('../../secret.md', 'guide/chapter 02.md', files)
    ).toBeNull();
  });
});
