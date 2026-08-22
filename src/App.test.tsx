// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

class IntersectionObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  vi.stubGlobal('scrollTo', vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('critical reader interactions', () => {
  it('enters focus mode and exits with Escape', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('button', { name: 'Focus mode' }));
    expect(
      container.querySelector('.app-shell')?.classList.contains('focus-mode')
    ).toBe(true);
    expect(screen.getByRole('button', { name: /Exit Focus/ })).not.toBeNull();
    await user.keyboard('{Escape}');
    expect(
      container.querySelector('.app-shell')?.classList.contains('focus-mode')
    ).toBe(false);
  });

  it('opens a local file, highlights search, and intercepts relative links', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const picker =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(picker).not.toBeNull();
    const file = new File(
      ['# Guide\n\nFind this phrase. [Next](next.md)'],
      'guide.md',
      { type: 'text/markdown' }
    );
    if (!picker) throw new Error('File picker was not rendered.');
    fireEvent.change(picker, { target: { files: [file] } });
    await screen.findByRole('heading', { name: 'Guide' });
    await user.click(screen.getByRole('button', { name: 'Search document' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Search this document' }),
      'phrase'
    );
    expect(container.querySelector('mark')?.textContent).toBe('phrase');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(
      await screen.findByText(
        'Open the containing folder to follow local Markdown links.'
      )
    ).not.toBeNull();
  });

  it('persists validated reading settings', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole('button', { name: 'Open reading settings' })
    );
    await user.selectOptions(screen.getByLabelText('Font'), 'literata');
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem('markdown-reader:preferences') || '{}')
          .font
      ).toBe('literata')
    );
  });
});
