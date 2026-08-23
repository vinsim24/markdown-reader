import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import MarkdownDocument from './components/MarkdownDocument';
import ReaderSidebar from './components/ReaderSidebar';
import ReadingSettings from './components/ReadingSettings';
import {
  type FolderWorkspace,
  pickDirectory,
  supportsDirectoryPicker,
  workspaceFromFileList,
} from './lib/fileAccess';
import { extractHeadings } from './lib/headings';
import { resolveMarkdownTarget } from './lib/paths';
import {
  type CustomColors,
  contrastRatio,
  defaultPreferences,
  loadPreferences,
  savePreferences,
  themeColors,
} from './lib/preferences';

function decodePathSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function App() {
  const [markdown, setMarkdown] = useState('');
  const [fileName, setFileName] = useState<string>();
  const [preferences, setPreferences] = useState(loadPreferences);
  const [settings, setSettings] = useState(false);
  const [nav, setNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [linkNotice, setLinkNotice] = useState('');
  const [folder, setFolder] = useState<FolderWorkspace>();
  const [activePath, setActivePath] = useState('');
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
  const hasDocument = fileName !== undefined;
  const headings = useMemo(() => extractHeadings(markdown), [markdown]);
  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const readingMinutes = words ? Math.max(1, Math.ceil(words / 225)) : 0;
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
  const closeDocument = () => {
    setMarkdown('');
    setFileName(undefined);
    setFolder(undefined);
    setActivePath('');
    setSearch('');
    setSearchOpen(false);
    setFocusMode(false);
    setNav(false);
    setSettings(false);
    setLinkNotice('');
    setActiveHeading('');
    updateDocumentLocation();
    window.scrollTo({ top: 0 });
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
  const notice = linkNotice ? (
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
  ) : null;
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
        <button
          type="button"
          className="brand"
          onClick={closeDocument}
          aria-label="Return to start"
        >
          <span className="brand-mark">⌁</span>
          <span>markdown reader</span>
        </button>
        <div className="topbar-actions">
          {hasDocument && (
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
          )}
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
          {hasDocument && (
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
          )}
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
      <div className={`workspace${hasDocument ? '' : ' empty-workspace'}`}>
        {hasDocument && (
          <ReaderSidebar
            activeHeading={activeHeading}
            activePath={activePath}
            fileName={fileName}
            folder={folder}
            headings={headings}
            navOpen={nav}
            onClose={() => setNav(false)}
            onHeadingSelect={(id) => {
              setActiveHeading(id);
              setNav(false);
            }}
            onOpenFile={openFolderFile}
            readingMinutes={readingMinutes}
            words={words}
          />
        )}
        <main className="main-area">
          {hasDocument ? (
            <>
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
              {notice}
              <MarkdownDocument
                activePath={activePath}
                files={folder?.files}
                markdown={markdown}
                onRelativeLink={openRelativeLink}
                search={search}
                theme={preferences.theme}
              />
              <footer className="reader-footer">
                <span>End of document</span>
                <span>•</span>
                <span>Markdown Reader</span>
              </footer>
            </>
          ) : (
            <>
              {notice}
              <section className="welcome" aria-labelledby="welcome-title">
                <span className="welcome-mark" aria-hidden="true">
                  MD
                </span>
                <p className="eyebrow">Your private reading space</p>
                <h1 id="welcome-title">Open a Markdown document</h1>
                <p className="welcome-copy">
                  Choose a file or folder to begin. Your documents stay on this
                  device and are never uploaded.
                </p>
                <div className="welcome-actions">
                  <button
                    type="button"
                    className="welcome-primary"
                    onClick={() => input.current?.click()}
                  >
                    Open file
                  </button>
                  <button
                    type="button"
                    className="welcome-secondary"
                    onClick={openFolder}
                    disabled={folderLoading}
                  >
                    {folderLoading ? 'Scanning…' : 'Open folder'}
                  </button>
                </div>
                <p className="welcome-drop">or drop a .md or .markdown file</p>
              </section>
            </>
          )}
        </main>
      </div>
      {hasDocument && focusMode && (
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
        <ReadingSettings
          lowContrast={lowContrast}
          onClose={closeSettings}
          onResetAll={() => {
            localStorage.removeItem('markdown-reader:preferences');
            skipPreferenceSave.current = true;
            setPreferences({ ...defaultPreferences });
          }}
          onSetCustomColor={setCustomColor}
          panelRef={settingsPanel}
          preferences={preferences}
          selectedColors={selectedColors}
          setPreferences={setPreferences}
        />
      )}
    </div>
  );
}
