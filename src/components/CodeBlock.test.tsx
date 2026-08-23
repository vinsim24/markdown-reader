// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CodeBlock from './CodeBlock';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CodeBlock', () => {
  it('labels the language and copies highlighted source text', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <CodeBlock className="hljs language-python">
        <span className="hljs-built_in">print</span>(&quot;hello&quot;)
      </CodeBlock>
    );

    expect(screen.getByText('Python')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Copy Python code' }));
    expect(writeText).toHaveBeenCalledWith('print("hello")');
    expect(
      screen.getByRole('button', { name: 'Copied Python code' })
    ).not.toBeNull();
  });
});
