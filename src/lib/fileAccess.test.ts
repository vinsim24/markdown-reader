import { describe, expect, it } from 'vitest';
import {
  fileVersion,
  type DirectoryHandleLike,
  sameFileVersion,
  scanDirectory,
} from './fileAccess';

function directory(
  name: string,
  entries: Array<
    | DirectoryHandleLike
    | { kind: 'file'; name: string; getFile(): Promise<File> }
  >
): DirectoryHandleLike {
  return {
    kind: 'directory',
    name,
    async *values() {
      for (const entry of entries) yield entry;
    },
  };
}

function file(name: string, contents = '') {
  return {
    kind: 'file' as const,
    name,
    getFile: async () => new File([contents], name),
  };
}

describe('scanDirectory', () => {
  it('accepts an injectable in-memory directory adapter and indexes recursively', async () => {
    const root = directory('Library', [
      file('README.md', '# Home'),
      file('photo.svg'),
      directory('Nested', [file('Chapter.markdown', '# Chapter')]),
    ]);
    const workspace = await scanDirectory(root);
    expect(workspace.markdownPaths).toEqual([
      'Nested/Chapter.markdown',
      'README.md',
    ]);
    expect(workspace.files.get('photo.svg')?.name).toBe('photo.svg');
    expect(workspace.handles.get('README.md')?.name).toBe('README.md');
  });

  it('compares the accepted size and modification time for disk refresh checks', () => {
    const original = new File(['# One'], 'note.md', { lastModified: 100 });
    const unchanged = new File(['# Two'], 'note.md', { lastModified: 100 });
    const changed = new File(['# Changed'], 'note.md', { lastModified: 200 });

    expect(sameFileVersion(fileVersion(original), fileVersion(unchanged))).toBe(
      true
    );
    expect(sameFileVersion(fileVersion(original), fileVersion(changed))).toBe(
      false
    );
  });
});
