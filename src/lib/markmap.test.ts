// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { sanitizeMarkmapTree } from './markmap';

describe('sanitizeMarkmapTree', () => {
  it('keeps readable labels while escaping transformed HTML', () => {
    const tree = sanitizeMarkmapTree({
      content: '<strong>Safe &amp; useful</strong><img src=x onerror=alert(1)>',
      children: [
        { content: '<script>alert(1)</script><em>Child</em>', children: [] },
      ],
    });

    expect(tree.content).toBe('Safe &amp; useful');
    expect(tree.children[0]?.content).toBe('Child');
    expect(tree.content).not.toContain('<img');
    expect(tree.children[0]?.content).not.toContain('<script');
  });
});
