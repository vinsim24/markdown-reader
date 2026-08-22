import { describe, expect, it } from 'vitest';
import { extractHeadings } from './headings';

describe('extractHeadings', () => {
  it('creates deterministic unique GitHub-style IDs', () => {
    expect(extractHeadings('# Hello, World!\n## Hello, World!\n# Héllo 世界')).toEqual([
      { text: 'Hello, World!', level: 1, id: 'hello-world' },
      { text: 'Hello, World!', level: 2, id: 'hello-world-1' },
      { text: 'Héllo 世界', level: 1, id: 'héllo-世界' },
    ]);
  });
  it('uses rendered labels for formatted and linked headings', () => {
    expect(extractHeadings('## **Read** [the guide](./guide.md)')).toEqual([
      { text: 'Read the guide', level: 2, id: 'read-the-guide' },
    ]);
  });
});

