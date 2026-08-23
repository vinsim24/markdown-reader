import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import {
  parseObsidianDocument,
  remarkObsidian,
  resolveObsidianWikilink,
} from './obsidian';

describe('Obsidian Markdown', () => {
  it('extracts leading properties without treating later rules as frontmatter', () => {
    expect(
      parseObsidianDocument(
        '---\ntags: [notes, demo]\nalias: Reader\n---\n# Note'
      )
    ).toEqual({
      markdown: '# Note',
      properties: [
        { key: 'tags', value: '[notes, demo]' },
        { key: 'alias', value: 'Reader' },
      ],
    });
  });

  it('transforms wikilinks, embeds, highlights, tags, and callouts', () => {
    const tree = unified()
      .use(remarkParse)
      .use(remarkObsidian)
      .runSync(
        unified()
          .use(remarkParse)
          .parse(
            '> [!tip] Read this\n\n[[Daily note|Today]] ![[diagram.png|300]] ==marked== #demo'
          )
      );
    expect(JSON.stringify(tree)).toContain('obsidian-callout-tip');
    expect(JSON.stringify(tree)).toContain('Daily note.md?obsidian-wikilink');
    expect(JSON.stringify(tree)).toContain('obsidian-image-embed:300');
    expect(JSON.stringify(tree)).toContain('obsidian-tag');
    expect(JSON.stringify(tree)).toContain('hName":"mark');
  });

  it('resolves a unique vault note by basename', () => {
    expect(
      resolveObsidianWikilink(
        'Daily%20note.md?obsidian-wikilink#workflow',
        'areas/current.md',
        ['notes/Daily note.md', 'areas/current.md']
      )
    ).toEqual({ path: 'notes/Daily note.md', anchor: 'workflow', query: '' });
  });
});
