import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Element, Root, RootContent, Text } from 'hast';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import FileTree from './components/FileTree';
import LocalImage from './components/LocalImage';
import {
  pickDirectory,
  supportsDirectoryPicker,
  type FolderWorkspace,
  workspaceFromFileList,
} from './lib/fileAccess';
import { isExternalUrl, resolveMarkdownTarget } from './lib/paths';

type Theme = 'light' | 'dark' | 'sepia' | 'mono' | 'cappuccino' | 'contrast';
type Font = 'inter' | 'source-serif' | 'literata' | 'atkinson' | 'jetbrains';

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

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
function getText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) return children.map(getText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return getText((children as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}
function decodePathSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getHeadings(md: string) {
  return Array.from(md.matchAll(/^(#{1,6})\s+(.+?)\s*#*$/gm), (match) => ({
    text: match[2].replace(/[*_`~[\]]/g, ''),
    level: match[1].length,
    id: slug(match[2].replace(/[*_`~[\]]/g, '')),
  }));
}

function rehypeHighlight(search: string) {
  return (tree: Root) => {
    const query = search.trim().toLowerCase();
    if (!query) return;

    const highlight = (node: Root | Element, excluded = false) => {
      const skip = excluded || (node.type === 'element' && ['code', 'pre'].includes(node.tagName));
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
            children.push({ type: 'text', value: child.value.slice(offset, match) } as Text);
          }
          children.push({
            type: 'element',
            tagName: 'mark',
            properties: {},
            children: [{ type: 'text', value: child.value.slice(match, match + query.length) }],
          });
          offset = match + query.length;
          match = child.value.toLowerCase().indexOf(query, offset);
        }
        if (offset < child.value.length) {
          children.push({ type: 'text', value: child.value.slice(offset) } as Text);
        }
      }

      node.children = children;
    };

    highlight(tree);
  };
}

const themes: { key: Theme; label: string; swatch: string }[] = [
  { key: 'light', label: 'Light', swatch: 'light-swatch' },
  { key: 'dark', label: 'Dark', swatch: 'dark-swatch' },
  { key: 'sepia', label: 'Sepia', swatch: 'sepia-swatch' },
  { key: 'mono', label: 'Mono', swatch: 'mono-swatch' },
  { key: 'cappuccino', label: 'Cappuccino', swatch: 'cappuccino-swatch' },
  { key: 'contrast', label: 'Contrast', swatch: 'contrast-swatch' },
];

export default function App() {
  const [markdown, setMarkdown] = useState(sample);
  const [fileName, setFileName] = useState('payment-system.md');
  const [theme, setTheme] = useState<Theme>('light');
  const [font, setFont] = useState<Font>('inter');
  const [size, setSize] = useState(18);
  const [width, setWidth] = useState(720);
  const [settings, setSettings] = useState(false);
  const [nav, setNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [linkNotice, setLinkNotice] = useState('');
  const [folder, setFolder] = useState<FolderWorkspace>();
  const [activePath, setActivePath] = useState('payment-system.md');
  const [folderLoading, setFolderLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const headings = useMemo(() => getHeadings(markdown), [markdown]);
  const words = markdown.trim().split(/\s+/).length;
  const readingMinutes = Math.max(1, Math.ceil(words / 225));
  useEffect(() => {
    document.body.dataset.theme = theme;
    document.body.dataset.font = font;
  }, [theme, font]);
  useEffect(() => {
    if (!focusMode) return;
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocusMode(false);
    };
    window.addEventListener('keydown', exitOnEscape);
    return () => window.removeEventListener('keydown', exitOnEscape);
  }, [focusMode]);
  const openFile = (file: File) => {
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
  const openFolderFile = async (path: string, anchor = '') => {
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
        requestAnimationFrame(() => document.getElementById(decodePathSafe(anchor))?.scrollIntoView());
      });
    } else window.scrollTo({ top: 0 });
  };
  const activateFolder = async (workspace: FolderWorkspace | null) => {
    if (!workspace) return;
    setFolder(workspace);
    if (workspace.markdownPaths.length === 0) {
      setLinkNotice(`No Markdown files were found in ${workspace.name}.`);
      return;
    }
    const first = workspace.markdownPaths[0];
    const file = workspace.files.get(first)!;
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
      setLinkNotice('The folder could not be opened. Check its permissions and try again.');
    } finally {
      setFolderLoading(false);
    }
  };
  const openRelativeLink = async (href: string) => {
    if (!folder) {
      setLinkNotice('Open the containing folder to follow local Markdown links.');
      return;
    }
    const target = resolveMarkdownTarget(href, activePath, new Set(folder.markdownPaths));
    if (!target) {
      setLinkNotice(`Could not find “${href}” inside ${folder.name}.`);
      return;
    }
    if (target.path === activePath) {
      document.getElementById(decodePathSafe(target.anchor))?.scrollIntoView();
      return;
    }
    await openFolderFile(target.path, target.anchor);
  };
  const style = {
    '--reading-size': `${size}px`,
    '--reading-width': `${width}px`,
  } as CSSProperties;
  return (
    <div
      className={`app-shell theme-${theme} font-${font}${focusMode ? ' focus-mode' : ''}`}
      style={style}
    >
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">⌁</span>
          <span>markdown reader</span>
        </div>
        <div className="topbar-actions">
          <button
            className="icon-button mobile-only"
            onClick={() => setNav(true)}
          >
            ☰
          </button>
          <button
            className="toolbar-button"
            onClick={() => input.current?.click()}
          >
            <span>＋</span> Open file
          </button>
          <button type="button" className="toolbar-button" onClick={openFolder} disabled={folderLoading}>
            <span>⌑</span> {folderLoading ? 'Scanning…' : 'Open folder'}
          </button>
          <button
            className="icon-button"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            ⌕
          </button>
          <button className="icon-button" onClick={() => setSettings(true)}>
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
            onChange={(event) => event.target.files && activateFolder(workspaceFromFileList(event.target.files))}
          />
        </div>
      </header>
      <div className="workspace">
        <aside className={`sidebar ${nav ? 'open' : ''}`}>
          <div className="sidebar-heading">
            <span>Navigation</span>
            <button
              className="close-nav mobile-only"
              onClick={() => setNav(false)}
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
                <FileTree paths={folder.markdownPaths} activePath={activePath} onOpen={openFolderFile} />
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
                className={`level-${heading.level}`}
                href={`#${heading.id}`}
                onClick={() => setNav(false)}
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
                className="subtle-button"
                onClick={() => setSettings(true)}
              >
                Aa&nbsp; Reading
              </button>
            </div>
          </div>
          {searchOpen && (
            <div className="search-panel open">
              <input
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
              rehypePlugins={[rehypeSanitize, [rehypeHighlight, search]]}
              components={{
                h1: ({ children }) => <h1 id={slug(getText(children))}>{children}</h1>,
                h2: ({ children }) => <h2 id={slug(getText(children))}>{children}</h2>,
                h3: ({ children }) => <h3 id={slug(getText(children))}>{children}</h3>,
                h4: ({ children }) => <h4 id={slug(getText(children))}>{children}</h4>,
                h5: ({ children }) => <h5 id={slug(getText(children))}>{children}</h5>,
                h6: ({ children }) => <h6 id={slug(getText(children))}>{children}</h6>,
                a: ({ href = '', children, ...props }) => {
                  if (href.startsWith('#')) return <a href={href} {...props}>{children}</a>;
                  if (/^https?:\/\//i.test(href)) {
                    return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                  }
                  if (isExternalUrl(href)) return <a href={href} {...props}>{children}</a>;
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
                  <LocalImage src={src} alt={alt} currentPath={activePath} files={folder?.files} />
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
        <div
          className="overlay open"
          onClick={() => {
            setSettings(false);
            setNav(false);
          }}
        />
      )}
      {settings && (
        <section className="settings-panel open">
          <div className="settings-header">
            <div>
              <span className="eyebrow">Personalize</span>
              <h2>Reading settings</h2>
            </div>
            <button className="close-button" onClick={() => setSettings(false)}>
              ×
            </button>
          </div>
          <div className="setting-group">
            <label>Font</label>
            <select
              value={font}
              onChange={(e) => setFont(e.target.value as Font)}
            >
              <option value="inter">Inter</option>
              <option value="source-serif">Source Serif 4</option>
              <option value="literata">Literata</option>
              <option value="atkinson">Atkinson Hyperlegible</option>
              <option value="jetbrains">JetBrains Mono</option>
            </select>
          </div>
          <div className="setting-group">
            <label>Theme</label>
            <div className="theme-grid">
              {themes.map((item) => (
                <button
                  key={item.key}
                  className={`theme-choice ${theme === item.key ? 'active' : ''}`}
                  onClick={() => setTheme(item.key)}
                >
                  <i className={`swatch ${item.swatch}`} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-group">
            <div className="range-label">
              <label>Text size</label>
              <span>{size}px</span>
            </div>
            <input
              type="range"
              min="15"
              max="23"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </div>
          <div className="setting-group">
            <div className="range-label">
              <label>Reading width</label>
              <span>{width}px</span>
            </div>
            <input
              type="range"
              min="600"
              max="900"
              value={width}
              step="20"
              onChange={(e) => setWidth(Number(e.target.value))}
            />
          </div>
          <button
            className="reset-button"
            onClick={() => {
              setTheme('light');
              setFont('inter');
              setSize(18);
              setWidth(720);
            }}
          >
            Reset preferences
          </button>
        </section>
      )}
    </div>
  );
}
