import type { Element, Root, RootContent, Text } from 'hast';
import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import FileTree from './components/FileTree';
import LocalImage from './components/LocalImage';
import {
  type FolderWorkspace,
  pickDirectory,
  supportsDirectoryPicker,
  workspaceFromFileList,
} from './lib/fileAccess';
import { extractHeadings, rehypeHeadingIds } from './lib/headings';
import { isExternalUrl, resolveMarkdownTarget } from './lib/paths';
import {
  type CustomColors,
  contrastRatio,
  defaultPreferences,
  type Font,
  loadPreferences,
  savePreferences,
  type Theme,
  themeColors,
  themeFonts,
} from './lib/preferences';

const sample = `# Payment System

We'll design a payment system in this chapter, which underpins all of modern e-commerce.

A payment system is used to settle financial transactions, transferring monetary value.

## Step 1 — Understand the Problem and Establish Design Scope

- **C:** What kind of payment system are we building?
- **I:** A payment backend for an e-commerce system, similar to Amazon.com. It handles everything related to money movement.
- **C:** What payment options are supported — credit cards, PayPal, bank cards, etc.?
- **I:** The system should support all these options in real life. For the purposes of the interview, we can use credit card payments.
- **C:** Do we handle credit card processing ourselves?
- **I:** No, we use a third-party provider like Stripe, Braintree, Square, etc.
- **C:** Do we store credit card data in our system?
- **I:** Due to compliance reasons, we do not store credit card data directly in our systems.

## Step 2 — Core Requirements

The system should provide a reliable way to authorize, capture, refund, and reconcile payments. Every operation should be **idempotent**, traceable, and safe to retry.

### Key decisions

1. Use a payment provider abstraction so we can support multiple providers.
2. Keep an immutable transaction history for reconciliation.
3. Publish payment events after state changes are committed.

> The most important property of a payment system is that a customer is never charged twice for the same order.

## Example: Payment State

\`\`\`text
CREATED → AUTHORIZED → CAPTURED
                    ↘ FAILED
\`\`\`
`;

const themes: { key: Theme; label: string; swatch: string }[] = [
  { key: 'light', label: 'Light', swatch: 'light-swatch' },
  { key: 'dark', label: 'Dark', swatch: 'dark-swatch' },
  { key: 'sepia', label: 'Sepia', swatch: 'sepia-swatch' },
  { key: 'mono', label: 'Mono', swatch: 'mono-swatch' },
  { key: 'cappuccino', label: 'Cappuccino', swatch: 'cappuccino-swatch' },
  { key: 'contrast', label: 'High Contrast', swatch: 'contrast-swatch' },
];

function decodePathSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function rehypeHighlight(search: string) {
  return (tree: Root) => {
    const query = search.trim().toLowerCase();
    if (!query) return;

    const highlight = (node: Root | Element, excluded = false) => {
      const skip =
        excluded ||
        (node.type === 'element' && ['code', 'pre'].includes(node.tagName));
      const children: RootContent[] = [];

      for (const child of node.children) {
        if (child.type === 'element') highlight(child, skip);
        if (skip || child.type !== 'text') {
          children.push(child);
          continue;
        }

        let offset = 0;
        let match = child.value.toLowerCase().indexOf(query);
        while (match !== -1) {
          if (match > offset) {
            children.push({
              type: 'text',
              value: child.value.slice(offset, match),
            } as Text);
          }
          children.push({
            type: 'element',
            tagName: 'mark',
            properties: {},
            children: [
              {
                type: 'text',
                value: child.value.slice(match, match + query.length),
              },
            ],
          });
          offset = match + query.length;
          match = child.value.toLowerCase().indexOf(query, offset);
        }
        if (offset < child.value.length) {
          children.push({
            type: 'text',
            value: child.value.slice(offset),
          } as Text);
        }
      }

      node.children = children;
    };

    highlight(tree);
  };
}

export default function App() {
  const [markdown, setMarkdown] = useState(sample);
  const [fileName, setFileName] = useState('payment-system.md');
  const [preferences, setPreferences] = useState(loadPreferences);
  const [settings, setSettings] = useState(false);
  const [nav, setNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [linkNotice, setLinkNotice] = useState('');
  const [folder, setFolder] = useState<FolderWorkspace>();
  const [activePath, setActivePath] = useState('payment-system.md');
  const [folderLoading, setFolderLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeHeading, setActiveHeading] = useState('');
  const dragDepth = useRef(0);
  const skipPreferenceSave = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const settingsPanel = useRef<HTMLElement>(null);
  const settingsReturnFocus = useRef<HTMLButtonElement>(null);
  const navTrigger = useRef<HTMLButtonElement>(null);
  const headings = useMemo(() => extractHeadings(markdown), [markdown]);
  const words = markdown.trim().split(/\s+/).length;
  const readingMinutes = Math.max(1, Math.ceil(words / 225));
  const openSettings = (event: ReactMouseEvent<HTMLButtonElement>) => {
    settingsReturnFocus.current = event.currentTarget;
    setSettings(true);
    setNav(false);
  };
  const closeSettings = () => {
    setSettings(false);
    requestAnimationFrame(() => settingsReturnFocus.current?.focus());
  };
  useEffect(() => {
    document.body.dataset.theme = preferences.theme;
    document.body.dataset.font = preferences.font;
    if (skipPreferenceSave.current) skipPreferenceSave.current = false;
    else savePreferences(preferences);
  }, [preferences]);
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.reader h1, .reader h2, .reader h3, .reader h4, .reader h5, .reader h6'
      )
    );
    if (elements.length === 0) {
      setActiveHeading('');
      return;
    }
    setActiveHeading(elements[0].id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveHeading((visible[0].target as HTMLElement).id);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );
    elements.forEach((element) => {
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, [markdown, focusMode]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (settings) {
        closeSettings();
      } else if (nav) {
        setNav(false);
        requestAnimationFrame(() => navTrigger.current?.focus());
      } else if (focusMode) setFocusMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode, nav, settings]);
  useEffect(() => {
    if (!settings || !settingsPanel.current) return;
    const panel = settingsPanel.current;
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button, input, select, [href], [tabindex]:not([tabindex="-1"])'
      )
    );
    focusable[0]?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', trapFocus);
    return () => panel.removeEventListener('keydown', trapFocus);
  }, [settings]);
  const openFile = (file: File) => {
    if (!/\.(md|markdown)$/i.test(file.name)) {
      setLinkNotice(
        'Choose a .md or .markdown file. Other file types are not supported.'
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMarkdown(String(reader.result));
      setFileName(file.name);
      setActivePath(file.name);
      setFolder(undefined);
      setLinkNotice(`Opened ${file.name}`);
    };
    reader.readAsText(file);
  };
  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    const file = event.dataTransfer?.files[0];
    if (file) openFile(file);
  };
  useEffect(() => {
    const enter = (event: DragEvent) => {
      event.preventDefault();
      dragDepth.current += 1;
      setDragActive(true);
    };
    const over = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };
    const leave = (event: DragEvent) => {
      event.preventDefault();
      dragDepth.current -= 1;
      if (dragDepth.current <= 0) setDragActive(false);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', handleDrop);
    };
  });
  const updateDocumentLocation = (query = '', anchor = '') => {
    const searchPart = query ? `?${query}` : '';
    const hashPart = anchor
      ? `#${encodeURIComponent(decodePathSafe(anchor))}`
      : '';
    history.replaceState(
      null,
      '',
      `${location.pathname}${searchPart}${hashPart}`
    );
  };
  const openFolderFile = async (path: string, anchor = '', query = '') => {
    const file = folder?.files.get(path);
    if (!file) return;
    setMarkdown(await file.text());
    setFileName(path.split('/').at(-1) || path);
    setActivePath(path);
    setSearch('');
    setNav(false);
    setLinkNotice(`Opened ${path}`);
    if (anchor) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const decodedAnchor = decodePathSafe(anchor);
          updateDocumentLocation(query, anchor);
          document.getElementById(decodedAnchor)?.scrollIntoView();
        });
      });
    } else {
      updateDocumentLocation(query);
      window.scrollTo({ top: 0 });
    }
  };
  const activateFolder = async (workspace: FolderWorkspace | null) => {
    if (!workspace) return;
    setFolder(workspace);
    if (workspace.markdownPaths.length === 0) {
      setLinkNotice(`No Markdown files were found in ${workspace.name}.`);
      return;
    }
    const first = workspace.markdownPaths[0];
    const file = workspace.files.get(first);
    if (!file) return;
    setMarkdown(await file.text());
    setFileName(first.split('/').at(-1) || first);
    setActivePath(first);
    setSearch('');
    setLinkNotice(`Opened folder ${workspace.name}`);
  };
  const openFolder = async () => {
    if (!supportsDirectoryPicker()) {
      folderInput.current?.click();
      return;
    }
    setFolderLoading(true);
    try {
      await activateFolder(await pickDirectory());
    } catch {
      setLinkNotice(
        'The folder could not be opened. Check its permissions and try again.'
      );
    } finally {
      setFolderLoading(false);
    }
  };
  const openRelativeLink = async (href: string) => {
    if (!folder) {
      setLinkNotice(
        'Open the containing folder to follow local Markdown links.'
      );
      return;
    }
    const target = resolveMarkdownTarget(
      href,
      activePath,
      new Set(folder.markdownPaths)
    );
    if (!target) {
      setLinkNotice(`Could not find “${href}” inside ${folder.name}.`);
      return;
    }
    if (target.path === activePath) {
      const decodedAnchor = decodePathSafe(target.anchor);
      updateDocumentLocation(target.query, target.anchor);
      document.getElementById(decodedAnchor)?.scrollIntoView();
      return;
    }
    await openFolderFile(target.path, target.anchor, target.query);
  };
  const style = {
    '--reading-size': `${preferences.size}px`,
    '--reading-width': `${preferences.width}px`,
    '--reading-line-height': preferences.lineHeight,
    ...(preferences.customColors
      ? {
          '--bg': preferences.customColors.background,
          '--text': preferences.customColors.text,
          '--accent': preferences.customColors.accent,
        }
      : {}),
  } as CSSProperties;
  const selectedColors =
    preferences.customColors || themeColors[preferences.theme];
  const lowContrast =
    contrastRatio(selectedColors.background, selectedColors.text) < 4.5;
  const setCustomColor = (key: keyof CustomColors, value: string) => {
    setPreferences((current) => ({
      ...current,
      customColors: {
        ...(current.customColors || themeColors[current.theme]),
        [key]: value,
      },
    }));
  };
  return (
    <div
      className={`app-shell theme-${preferences.theme} font-${preferences.font} code-${preferences.codeTheme}${focusMode ? ' focus-mode' : ''}`}
      style={style}
    >
      {dragActive && (
        <div className="drop-overlay" role="status">
          Drop a Markdown file to open it
        </div>
      )}
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">⌁</span>
          <span>markdown reader</span>
        </div>
        <div className="topbar-actions">
          <button
            ref={navTrigger}
            type="button"
            className="icon-button mobile-only"
            onClick={() => {
              setNav(true);
              setSettings(false);
            }}
            aria-label="Open navigation"
            aria-expanded={nav}
            aria-controls="reader-sidebar"
          >
            ☰
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => input.current?.click()}
          >
            <span>＋</span> Open file
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={openFolder}
            disabled={folderLoading}
          >
            <span>⌑</span> {folderLoading ? 'Scanning…' : 'Open folder'}
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Search document"
            aria-expanded={searchOpen}
            aria-controls="document-search"
          >
            ⌕
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={openSettings}
            aria-label="Open reading settings"
            aria-expanded={settings}
            aria-controls="reading-settings"
          >
            ☼
          </button>
          <input
            ref={input}
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            hidden
            onChange={(e) => e.target.files?.[0] && openFile(e.target.files[0])}
          />
          <input
            ref={(element) => {
              folderInput.current = element;
              element?.setAttribute('webkitdirectory', '');
              element?.setAttribute('directory', '');
            }}
            type="file"
            hidden
            multiple
            onChange={(event) =>
              event.target.files &&
              activateFolder(workspaceFromFileList(event.target.files))
            }
          />
        </div>
      </header>
      <div className="workspace">
        <aside
          id="reader-sidebar"
          className={`sidebar ${nav ? 'open' : ''}`}
          aria-label="Document navigation"
        >
          <div className="sidebar-heading">
            <span>Navigation</span>
            <button
              type="button"
              className="close-nav mobile-only"
              onClick={() => setNav(false)}
              aria-label="Close navigation"
            >
              ×
            </button>
          </div>
          <div className="file-card">
            <div className="file-icon">MD</div>
            <div>
              <strong>{fileName}</strong>
              <small>Local document · {readingMinutes} min read</small>
            </div>
          </div>
          {folder && (
            <div className="folder-section">
              <div className="toc-label">{folder.name}</div>
              {folder.markdownPaths.length > 0 ? (
                <FileTree
                  paths={folder.markdownPaths}
                  activePath={activePath}
                  onOpen={openFolderFile}
                />
              ) : (
                <p className="tree-empty">No Markdown files found</p>
              )}
            </div>
          )}
          <div className="toc-label">On this page</div>
          <nav className="toc">
            {headings.map((heading) => (
              <a
                key={heading.id}
                className={`level-${heading.level}${activeHeading === heading.id ? ' active' : ''}`}
                href={`#${heading.id}`}
                onClick={() => {
                  setActiveHeading(heading.id);
                  setNav(false);
                }}
                aria-current={
                  activeHeading === heading.id ? 'location' : undefined
                }
              >
                {heading.text}
              </a>
            ))}
          </nav>
          <div className="sidebar-footer">
            <span className="status-dot" />
            Local only <span className="footer-separator">·</span>
            {words.toLocaleString()} words
          </div>
        </aside>
        <main className="main-area">
          <div className="reader-toolbar">
            <div className="breadcrumbs">
              <span>Documents</span>
              <span>/</span>
              <strong>{fileName}</strong>
            </div>
            <div className="reader-actions">
              <button
                type="button"
                className="subtle-button"
                onClick={() => {
                  setFocusMode(true);
                  setNav(false);
                  setSettings(false);
                  setSearchOpen(false);
                }}
              >
                Focus mode
              </button>
              <button
                type="button"
                className="subtle-button"
                onClick={openSettings}
              >
                Aa&nbsp; Reading
              </button>
            </div>
          </div>
          {searchOpen && (
            <div id="document-search" className="search-panel open">
              <input
                aria-label="Search this document"
                placeholder="Search this document…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span>
                {search
                  ? `${(markdown.toLowerCase().match(new RegExp(search.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length} matches`
                  : '⌘ K'}
              </span>
            </div>
          )}
          {linkNotice && (
            <div className="link-notice" role="status">
              <span>{linkNotice}</span>
              <button
                type="button"
                onClick={() => setLinkNotice('')}
                aria-label="Dismiss message"
              >
                ×
              </button>
            </div>
          )}
          <article className="reader">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[
                rehypeSanitize,
                rehypeHeadingIds,
                [rehypeHighlight, search],
              ]}
              components={{
                a: ({ href = '', children, ...props }) => {
                  if (href.startsWith('#'))
                    return (
                      <a href={href} {...props}>
                        {children}
                      </a>
                    );
                  if (/^https?:\/\//i.test(href)) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      >
                        {children}
                      </a>
                    );
                  }
                  if (isExternalUrl(href))
                    return (
                      <a href={href} {...props}>
                        {children}
                      </a>
                    );
                  return (
                    <button
                      type="button"
                      className="relative-link"
                      onClick={() => openRelativeLink(href)}
                    >
                      {children}
                    </button>
                  );
                },
                img: ({ src, alt }) => (
                  <LocalImage
                    src={src}
                    alt={alt}
                    currentPath={activePath}
                    files={folder?.files}
                  />
                ),
              }}
            >
              {markdown}
            </ReactMarkdown>
          </article>
          <footer className="reader-footer">
            <span>End of document</span>
            <span>•</span>
            <span>Markdown Reader</span>
          </footer>
        </main>
      </div>
      {focusMode && (
        <button
          type="button"
          className="exit-focus"
          onClick={() => setFocusMode(false)}
        >
          Exit Focus <span>Esc</span>
        </button>
      )}
      {(settings || nav) && (
        <button
          type="button"
          className="overlay open"
          aria-label={settings ? 'Close reading settings' : 'Close navigation'}
          onClick={() => {
            setSettings(false);
            setNav(false);
            requestAnimationFrame(() =>
              (settings
                ? settingsReturnFocus.current
                : navTrigger.current
              )?.focus()
            );
          }}
        />
      )}
      {settings && (
        <section
          ref={settingsPanel}
          id="reading-settings"
          className="settings-panel open"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <div className="settings-header">
            <div>
              <span className="eyebrow">Personalize</span>
              <h2 id="settings-title">Reading settings</h2>
            </div>
            <button
              type="button"
              className="close-button"
              onClick={closeSettings}
              aria-label="Close reading settings"
            >
              ×
            </button>
          </div>
          <div className="setting-group">
            <label htmlFor="reader-font">Font</label>
            <select
              id="reader-font"
              value={preferences.font}
              onChange={(e) =>
                setPreferences((current) => ({
                  ...current,
                  font: e.target.value as Font,
                  fontExplicit: true,
                }))
              }
            >
              <option value="inter">Inter</option>
              <option value="source-serif">Source Serif 4</option>
              <option value="literata">Literata</option>
              <option value="charter">Charter</option>
              <option value="atkinson">Atkinson Hyperlegible</option>
              <option value="system-sans">System Sans</option>
              <option value="jetbrains">JetBrains Mono</option>
              <option value="system-mono">System Mono</option>
            </select>
          </div>
          <div className="setting-group">
            <span className="setting-label">Theme</span>
            <div className="theme-grid">
              {themes.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`theme-choice ${preferences.theme === item.key ? 'active' : ''}`}
                  onClick={() =>
                    setPreferences((current) => ({
                      ...current,
                      theme: item.key,
                      font: current.fontExplicit
                        ? current.font
                        : themeFonts[item.key],
                      customColors: undefined,
                    }))
                  }
                >
                  <i className={`swatch ${item.swatch}`} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-group">
            <div className="range-label">
              <label htmlFor="text-size">Text size</label>
              <span>{preferences.size}px</span>
            </div>
            <input
              type="range"
              id="text-size"
              min="15"
              max="23"
              value={preferences.size}
              onChange={(e) =>
                setPreferences((current) => ({
                  ...current,
                  size: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="setting-group">
            <div className="range-label">
              <label htmlFor="reading-width">Reading width</label>
              <span>{preferences.width}px</span>
            </div>
            <input
              type="range"
              id="reading-width"
              min="600"
              max="900"
              value={preferences.width}
              step="20"
              onChange={(e) =>
                setPreferences((current) => ({
                  ...current,
                  width: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="setting-group">
            <div className="range-label">
              <label htmlFor="line-height">Line height</label>
              <span>{preferences.lineHeight.toFixed(2)}</span>
            </div>
            <input
              id="line-height"
              type="range"
              min="1.35"
              max="2.1"
              step="0.05"
              value={preferences.lineHeight}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  lineHeight: Number(event.target.value),
                }))
              }
            />
          </div>
          <div className="setting-group">
            <label htmlFor="code-theme">Code-block theme</label>
            <select
              id="code-theme"
              value={preferences.codeTheme}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  codeTheme: event.target.value as 'auto' | 'light' | 'dark',
                }))
              }
            >
              <option value="auto">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <fieldset className="setting-group color-controls">
            <legend>Custom colors</legend>
            {(
              [
                ['background', 'Background'],
                ['text', 'Text'],
                ['accent', 'Accent / links'],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <input
                  type="color"
                  value={selectedColors[key]}
                  onChange={(event) => setCustomColor(key, event.target.value)}
                />
              </label>
            ))}
            {lowContrast && (
              <p className="contrast-warning" role="alert">
                Background and text contrast is below the recommended 4.5:1
                ratio.
              </p>
            )}
            <button
              type="button"
              className="reset-button compact"
              onClick={() =>
                setPreferences((current) => ({
                  ...current,
                  font: themeFonts[current.theme],
                  fontExplicit: false,
                  codeTheme: 'auto',
                  customColors: undefined,
                }))
              }
            >
              Reset theme defaults
            </button>
          </fieldset>
          <button
            type="button"
            className="reset-button"
            onClick={() => {
              localStorage.removeItem('markdown-reader:preferences');
              skipPreferenceSave.current = true;
              setPreferences({ ...defaultPreferences });
            }}
          >
            Reset all preferences
          </button>
        </section>
      )}
    </div>
  );
}
