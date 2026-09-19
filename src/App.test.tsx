// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorView } from 'codemirror';
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

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"></svg>',
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
  Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 16);
  Range.prototype.getClientRects = () =>
    ({
      length: 0,
      item: () => null,
      [Symbol.iterator]: function* () {},
    }) as DOMRectList;
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

    await user.click(screen.getByRole('button', { name: 'Preview' }));
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

  it('edits a session draft and protects it from accidental closing', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const picker = container.querySelector<HTMLInputElement>(
      'input[type="file"]:not([multiple])'
    );
    if (!picker) throw new Error('File picker was not rendered.');
    fireEvent.change(picker, {
      target: { files: [new File(['# Original'], 'draft.md')] },
    });

    await screen.findByRole('heading', { name: 'Original' });
    await user.click(screen.getByRole('button', { name: 'Write' }));
    const editor = await screen.findByRole('textbox', {
      name: 'Markdown editor for draft.md',
    });
    const editorView = EditorView.findFromDOM(editor);
    if (!editorView) throw new Error('CodeMirror editor was not initialized.');
    act(() => {
      editorView.dispatch({
        changes: { from: 0, insert: 'Edited in session\n\n' },
      });
      editorView.scrollDOM.scrollTop = 72;
      fireEvent.scroll(editorView.scrollDOM);
    });

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: /draft\.md.*Unsaved changes/,
        })
      ).not.toBeNull()
    );
    await user.click(screen.getByRole('button', { name: 'Split' }));
    const splitEditor = await screen.findByRole('textbox', {
      name: 'Markdown editor for draft.md',
    });
    const splitEditorView = EditorView.findFromDOM(splitEditor);
    expect(splitEditorView?.scrollDOM.scrollTop).toBe(72);
    const resizeHandle = screen.getAllByRole('separator', {
      name: 'Resize split panes',
    })[0];
    resizeHandle.focus();
    await user.keyboard('{ArrowRight}');
    expect(resizeHandle.getAttribute('aria-valuenow')).toBe('55');
    const preview = screen.getByLabelText('Live preview');
    preview.scrollTop = 96;
    fireEvent.scroll(preview);
    expect(
      await screen.findByText('Edited in session', { selector: '.reader p' })
    ).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(
      await screen.findByText('Edited in session', { selector: '.reader p' })
    ).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Split' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Live preview').scrollTop).toBe(96)
    );
    expect(
      screen
        .getAllByRole('separator', { name: 'Resize split panes' })[0]
        .getAttribute('aria-valuenow')
    ).toBe('55');

    const confirm = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    await user.click(screen.getByRole('button', { name: 'Close draft.md' }));
    expect(screen.getByRole('heading', { name: 'Original' })).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Close draft.md' }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole('heading', { name: 'Markdown, made comfortable.' })
    ).not.toBeNull();
  });

  it('shows locally opened files in recent documents without storing content', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const picker = container.querySelector<HTMLInputElement>(
      'input[type="file"]:not([multiple])'
    );
    if (!picker) throw new Error('File picker was not rendered.');
    fireEvent.change(picker, {
      target: { files: [new File(['# Private contents'], 'recent.md')] },
    });
    await screen.findByRole('heading', { name: 'Private contents' });
    await user.click(screen.getByRole('button', { name: 'Return to start' }));

    expect(
      screen.getByRole('heading', { name: 'Recent documents' })
    ).not.toBeNull();
    expect(
      screen.getByRole('button', { name: 'recent.md, Locate to reopen' })
    ).not.toBeNull();
    expect(screen.queryByText('Private contents')).toBeNull();
    await user.click(
      screen.getByRole('button', { name: 'Remove recent.md from history' })
    );
    expect(
      screen.queryByRole('button', { name: 'recent.md, Locate to reopen' })
    ).toBeNull();
  });

  it('saves an edited handle-backed document to its opened file', async () => {
    const user = userEvent.setup();
    let diskText = '# Original';
    let modified = 100;
    const write = vi.fn(async (value: string) => {
      diskText = value;
      modified += 1;
    });
    const handle = {
      kind: 'file' as const,
      name: 'writable.md',
      getFile: async () =>
        new File([diskText], 'writable.md', { lastModified: modified }),
      queryPermission: async () => 'granted' as const,
      requestPermission: async () => 'granted' as const,
      createWritable: async () => ({ close: async () => undefined, write }),
    };
    vi.stubGlobal('showOpenFilePicker', vi.fn().mockResolvedValue([handle]));
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Import Markdown' }));
    await screen.findByRole('heading', { name: 'Original' });
    await user.click(screen.getByRole('button', { name: 'Write' }));
    const editor = await screen.findByRole('textbox', {
      name: 'Markdown editor for writable.md',
    });
    const editorView = EditorView.findFromDOM(editor);
    if (!editorView) throw new Error('CodeMirror editor was not initialized.');
    act(() => editorView.dispatch({ changes: { from: 0, to: diskText.length, insert: '# Saved' } }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(write).toHaveBeenCalledWith('# Saved'));
    expect(diskText).toBe('# Saved');
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });

  it('protects dirty edits when the opened file changes on disk', async () => {
    const user = userEvent.setup();
    let diskText = '# Original';
    let modified = 100;
    const handle = {
      kind: 'file' as const,
      name: 'watched.md',
      getFile: async () =>
        new File([diskText], 'watched.md', { lastModified: modified }),
      queryPermission: async () => 'granted' as const,
      requestPermission: async () => 'granted' as const,
      createWritable: async () => ({ close: async () => undefined, write: async () => undefined }),
    };
    vi.stubGlobal('showOpenFilePicker', vi.fn().mockResolvedValue([handle]));
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Import Markdown' }));
    await user.click(screen.getByRole('button', { name: 'Write' }));
    const editor = await screen.findByRole('textbox', {
      name: 'Markdown editor for watched.md',
    });
    const editorView = EditorView.findFromDOM(editor);
    if (!editorView) throw new Error('CodeMirror editor was not initialized.');
    act(() => editorView.dispatch({ changes: { from: 0, to: diskText.length, insert: '# My edit' } }));
    diskText = '# External edit';
    modified += 1;
    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Changed on disk'
    );
    await user.click(screen.getByRole('button', { name: 'Keep my edits' }));
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(await screen.findByRole('heading', { name: 'My edit' })).not.toBeNull();
  });

  it('refreshes a clean handle-backed document after its disk copy changes', async () => {
    const user = userEvent.setup();
    let diskText = '# Original';
    let modified = 100;
    const handle = {
      kind: 'file' as const,
      name: 'refresh.md',
      getFile: async () =>
        new File([diskText], 'refresh.md', { lastModified: modified }),
      queryPermission: async () => 'granted' as const,
    };
    vi.stubGlobal('showOpenFilePicker', vi.fn().mockResolvedValue([handle]));
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Import Markdown' }));
    await screen.findByRole('heading', { name: 'Original' });
    diskText = '# Updated externally';
    modified += 1;
    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(
      await screen.findByRole('heading', { name: 'Updated externally' })
    ).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('requires confirmation before Save overwrites a changed disk copy', async () => {
    const user = userEvent.setup();
    let diskText = '# Original';
    let modified = 100;
    const write = vi.fn(async (value: string) => {
      diskText = value;
      modified += 1;
    });
    const handle = {
      kind: 'file' as const,
      name: 'conflict.md',
      getFile: async () =>
        new File([diskText], 'conflict.md', { lastModified: modified }),
      queryPermission: async () => 'granted' as const,
      createWritable: async () => ({ close: async () => undefined, write }),
    };
    vi.stubGlobal('showOpenFilePicker', vi.fn().mockResolvedValue([handle]));
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Import Markdown' }));
    await screen.findByRole('heading', { name: 'Original' });
    await user.click(screen.getByRole('button', { name: 'Write' }));
    const editor = await screen.findByRole('textbox', {
      name: 'Markdown editor for conflict.md',
    });
    const editorView = EditorView.findFromDOM(editor);
    if (!editorView) throw new Error('CodeMirror editor was not initialized.');
    act(() =>
      editorView.dispatch({
        changes: { from: 0, to: diskText.length, insert: '# My draft' },
      })
    );
    diskText = '# Disk changed';
    modified += 1;
    const confirm = vi.spyOn(window, 'confirm').mockReset().mockReturnValue(false);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(write).not.toHaveBeenCalled();
    expect(diskText).toBe('# Disk changed');
    expect(
      screen.getByRole('button', { name: /conflict\.md.*Unsaved changes/ })
    ).not.toBeNull();
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
