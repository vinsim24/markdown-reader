import { describe, expect, it, vi } from 'vitest';
import {
  fetchRemoteMarkdown,
  normalizeRemoteMarkdownUrl,
} from './remoteMarkdown';

describe('remote Markdown imports', () => {
  it('normalizes GitHub repositories and blob links to raw content', () => {
    expect(normalizeRemoteMarkdownUrl('openai/openai-node').href).toBe(
      'https://raw.githubusercontent.com/openai/openai-node/HEAD/README.md'
    );
    expect(
      normalizeRemoteMarkdownUrl(
        'https://github.com/example/docs/blob/main/guides/Start%20Here.md'
      ).href
    ).toBe(
      'https://raw.githubusercontent.com/example/docs/main/guides/Start%20Here.md'
    );
  });

  it('rejects unsafe URL schemes and credential-bearing URLs', () => {
    expect(() =>
      normalizeRemoteMarkdownUrl('file:///private/readme.md')
    ).toThrow('Only http and https');
    expect(() =>
      normalizeRemoteMarkdownUrl('https://user:secret@example.com/readme.md')
    ).toThrow('credentials');
  });

  it('fetches text without credentials and rejects unsupported content', async () => {
    const fetchRemote = vi.fn().mockResolvedValue(
      new Response('# Remote guide', {
        headers: { 'content-type': 'text/markdown; charset=utf-8' },
      })
    );
    await expect(
      fetchRemoteMarkdown('https://example.com/guide.md', fetchRemote)
    ).resolves.toEqual({
      markdown: '# Remote guide',
      sourceUrl: 'https://example.com/guide.md',
      title: 'guide.md',
    });
    expect(fetchRemote).toHaveBeenCalledWith(
      new URL('https://example.com/guide.md'),
      expect.objectContaining({ credentials: 'omit' })
    );

    await expect(
      fetchRemoteMarkdown(
        'https://example.com/image.png',
        vi.fn().mockResolvedValue(
          new Response('binary', {
            headers: { 'content-type': 'image/png' },
          })
        )
      )
    ).rejects.toThrow('unsupported content');
  });
});
