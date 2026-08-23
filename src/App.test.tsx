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

vi.mock('markmap-lib/no-plugins', () => ({
  Transformer: class {
    transform() {
      return { root: { content: 'Example', children: [] } };
    }
  },
}));

vi.mock('markmap-view', () => ({
  globalCSS: '',
  Markmap: {
    create: () => ({
      destroy: vi.fn(),
      fit: vi.fn().mockResolvedValue(undefined),
      rescale: vi.fn().mockResolvedValue(undefined),
      setData: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

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
  it('starts with private file-opening guidance instead of demo content', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Markdown, made comfortable.' })
    ).not.toBeNull();
    expect(screen.queryByText('Payment System')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Focus mode' })).toBeNull();
    expect(
      screen.getAllByRole('button', { name: 'Import Markdown' }).length
    ).toBeGreaterThan(0);
  });

  it('opens the bundled cheat sheet only after an explicit action', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    expect(
      screen.queryByRole('heading', { name: 'Markdown Cheat Sheet' })
    ).toBe(null);

    await user.click(screen.getByRole('button', { name: 'Open cheat sheet' }));
    expect(
      await screen.findByText('Markdown Cheat Sheet', { selector: 'h1' })
    ).not.toBeNull();
    expect(
      screen.getByText('Mermaid diagram', { selector: 'h2' })
    ).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(screen.getByRole('menuitem', { name: /Cheat sheet/ }));
    expect(container.querySelectorAll('.document-tab-select')).toHaveLength(1);
  });

  it('renders the bundled Obsidian guide through the sanitized reader', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(
      screen
        .getAllByRole('button', { name: 'Obsidian guide' })
        .at(-1) as HTMLElement
    );
    expect(
      await screen.findByText('Obsidian Markdown Cheat Sheet', {
        selector: 'h1',
      })
    ).not.toBeNull();
    expect(container.querySelector('.obsidian-properties')).not.toBeNull();
    expect(container.querySelector('.obsidian-callout-tip')).not.toBeNull();
    expect(container.querySelector('.obsidian-tag')?.textContent).toBe(
      '#project/reader'
    );
    expect(container.querySelector('mark')?.textContent).toBe(
      'highlight important passages'
    );
    expect(container.querySelector('.obsidian-note-embed')).not.toBeNull();
  });

  it('opens the bundled Markmap example as an alternate document view', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen
        .getAllByRole('button', { name: 'Markmap example' })
        .at(-1) as HTMLElement
    );
    expect(
      screen.getByRole('region', { name: 'Mind map for Markmap Examples.md' })
    ).not.toBeNull();
    expect(
      screen
        .getByRole('button', { name: 'Mind map' })
        .getAttribute('aria-pressed')
    ).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Reader' }));
    expect(
      await screen.findByRole('heading', { name: 'Markmap Examples' })
    ).not.toBeNull();
  });

  it('imports public Markdown through the URL dialog', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('# Remote document\n\nFetched directly.', {
          headers: { 'content-type': 'text/markdown' },
        })
      )
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Import from URL' }));
    const dialog = screen.getByRole('dialog', { name: 'Import from URL' });
    await user.type(
      screen.getByRole('textbox', { name: 'Markdown or GitHub URL' }),
      'https://example.com/guide.md'
    );
    await user.click(
      dialog.getElementsByClassName('welcome-primary')[0] as HTMLButtonElement
    );
    expect(
      await screen.findByRole('heading', { name: 'Remote document' })
    ).not.toBeNull();
    expect(
      screen.queryByRole('dialog', { name: 'Import from URL' })
    ).toBeNull();
  });

  it('offers the design.md README when no URL is handy', async () => {
    const user = userEvent.setup();
    const fetchRemote = vi.fn().mockResolvedValue(
      new Response('# design.md example', {
        headers: { 'content-type': 'text/plain' },
      })
    );
    vi.stubGlobal('fetch', fetchRemote);
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Import from URL' }));
    await user.click(
      screen.getByRole('button', { name: 'Import design.md README' })
    );
    expect(
      await screen.findByRole('heading', { name: 'design.md example' })
    ).not.toBeNull();
    expect(fetchRemote).toHaveBeenCalledWith(
      new URL(
        'https://raw.githubusercontent.com/google-labs-code/design.md/main/README.md'
      ),
      expect.objectContaining({ credentials: 'omit' })
    );
  });

  it('enters focus mode and exits with Escape', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const picker = container.querySelector<HTMLInputElement>(
      'input[type="file"]:not([multiple])'
    );
    if (!picker) throw new Error('File picker was not rendered.');
    fireEvent.change(picker, {
      target: {
        files: [
          new File(['# Focus document'], 'focus.md', {
            type: 'text/markdown',
          }),
        ],
      },
    });
    await screen.findByRole('heading', { name: 'Focus document' });
    await user.click(screen.getByRole('button', { name: 'Focus mode' }));
    expect(
      container.querySelector('.app-shell')?.classList.contains('focus-mode')
    ).toBe(true);
    expect(screen.getByRole('button', { name: /Exit Focus/ })).not.toBeNull();
    await user.keyboard('{Escape}');
    expect(
      container.querySelector('.app-shell')?.classList.contains('focus-mode')
    ).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Return to start' }));
    expect(
      screen.getByRole('heading', { name: 'Markdown, made comfortable.' })
    ).not.toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'Focus document' })
    ).toBeNull();
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

  it('opens, switches, and closes session-only document tabs', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const picker = container.querySelector<HTMLInputElement>(
      'input[type="file"]:not([multiple])'
    );
    if (!picker) throw new Error('File picker was not rendered.');

    fireEvent.change(picker, {
      target: { files: [new File(['# First'], 'first.md')] },
    });
    await screen.findByRole('heading', { name: 'First' });
    fireEvent.change(picker, {
      target: { files: [new File(['# Second'], 'second.md')] },
    });
    await screen.findByRole('heading', { name: 'Second' });

    const documentNavigation = screen.getByRole('navigation', {
      name: 'Open documents',
    });
    expect(
      documentNavigation.querySelectorAll('.document-tab-select')
    ).toHaveLength(2);
    expect(
      screen
        .getByRole('button', { name: 'second.md' })
        .getAttribute('aria-current')
    ).toBe('page');
    await user.click(screen.getByRole('button', { name: 'first.md' }));
    expect(screen.getByRole('heading', { name: 'First' })).not.toBeNull();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('heading', { name: 'Second' })).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Close second.md' }));
    expect(screen.getByRole('heading', { name: 'First' })).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Close first.md' }));
    expect(
      screen.getByRole('heading', { name: 'Markdown, made comfortable.' })
    ).not.toBeNull();
    expect(
      screen.queryByRole('navigation', { name: 'Open documents' })
    ).toBeNull();
  });

  it('renders math and allowed inline HTML while removing unsafe HTML', async () => {
    const { container } = render(<App />);
    const picker = container.querySelector<HTMLInputElement>(
      'input[type="file"]:not([multiple])'
    );
    if (!picker) throw new Error('File picker was not rendered.');
    fireEvent.change(picker, {
      target: {
        files: [
          new File(
            [
              '# Extended syntax\n\n$E = mc^2$\n\n<mark onclick="alert(1)">Safe highlight</mark><script>window.compromised = true</script>',
            ],
            'extended.md',
            { type: 'text/markdown' }
          ),
        ],
      },
    });

    await screen.findByRole('heading', { name: 'Extended syntax' });
    await waitFor(() =>
      expect(container.querySelector('.katex')).not.toBeNull()
    );
    expect(container.querySelector('mark')?.textContent).toBe('Safe highlight');
    expect(container.querySelector('mark')?.hasAttribute('onclick')).toBe(
      false
    );
    expect(container.querySelector('script')).toBeNull();
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
