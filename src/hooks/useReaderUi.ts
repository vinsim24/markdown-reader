import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

export function useReaderUi() {
  const [settings, setSettings] = useState(false);
  const [nav, setNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [linkNotice, setLinkNotice] = useState('');
  const [folderLoading, setFolderLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [urlImportOpen, setUrlImportOpen] = useState(false);
  const settingsPanel = useRef<HTMLElement>(null);
  const settingsReturnFocus = useRef<HTMLButtonElement>(null);
  const navTrigger = useRef<HTMLButtonElement>(null);
  const urlImportReturnFocus = useRef<HTMLButtonElement>(null);

  const openSettings = (event: ReactMouseEvent<HTMLButtonElement>) => {
    settingsReturnFocus.current = event.currentTarget;
    setSettings(true);
    setNav(false);
  };
  const closeSettings = () => {
    setSettings(false);
    requestAnimationFrame(() => settingsReturnFocus.current?.focus());
  };
  const resetDocumentUi = () => {
    setSearch('');
    setSearchOpen(false);
    setLinkNotice('');
    setNav(false);
    setSettings(false);
    setUrlImportOpen(false);
  };
  const openUrlImport = (event: ReactMouseEvent<HTMLButtonElement>) => {
    urlImportReturnFocus.current = event.currentTarget;
    setUrlImportOpen(true);
    setNav(false);
    setSettings(false);
  };
  const closeUrlImport = () => {
    setUrlImportOpen(false);
    requestAnimationFrame(() => urlImportReturnFocus.current?.focus());
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (urlImportOpen) closeUrlImport();
      else if (settings) closeSettings();
      else if (nav) {
        setNav(false);
        requestAnimationFrame(() => navTrigger.current?.focus());
      } else if (focusMode) setFocusMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode, nav, settings, urlImportOpen]);

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

  return {
    closeSettings,
    closeUrlImport,
    dragActive,
    focusMode,
    folderLoading,
    linkNotice,
    nav,
    navTrigger,
    openSettings,
    openUrlImport,
    resetDocumentUi,
    search,
    searchOpen,
    setDragActive,
    setFocusMode,
    setFolderLoading,
    setLinkNotice,
    setNav,
    setSearch,
    setSearchOpen,
    setSettings,
    setUrlImportOpen,
    settings,
    settingsPanel,
    settingsReturnFocus,
    urlImportOpen,
    urlImportReturnFocus,
  };
}
