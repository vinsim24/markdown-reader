import type { MouseEvent, RefObject } from 'react';

interface AppHeaderProps {
  fileInput: RefObject<HTMLInputElement | null>;
  folderInputRef: (element: HTMLInputElement | null) => void;
  folderLoading: boolean;
  hasDocument: boolean;
  navOpen: boolean;
  navTrigger: RefObject<HTMLButtonElement | null>;
  onCloseAll: () => void;
  onOpenCheatSheet: () => void;
  onOpenUrlImport: (event: MouseEvent<HTMLButtonElement>) => void;
  onFolderFiles: (files: FileList) => void;
  onOpenFile: (file: File) => void;
  onOpenFolder: () => void;
  onOpenNav: () => void;
  onOpenSettings: (event: MouseEvent<HTMLButtonElement>) => void;
  onToggleSearch: () => void;
  searchOpen: boolean;
  settingsOpen: boolean;
}

export default function AppHeader({
  fileInput,
  folderInputRef,
  folderLoading,
  hasDocument,
  navOpen,
  navTrigger,
  onCloseAll,
  onOpenCheatSheet,
  onOpenUrlImport,
  onFolderFiles,
  onOpenFile,
  onOpenFolder,
  onOpenNav,
  onOpenSettings,
  onToggleSearch,
  searchOpen,
  settingsOpen,
}: AppHeaderProps) {
  return (
    <header className="topbar">
      <button
        type="button"
        className="brand"
        onClick={onCloseAll}
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
            onClick={onOpenNav}
            aria-label="Open navigation"
            aria-expanded={navOpen}
            aria-controls="reader-sidebar"
          >
            ☰
          </button>
        )}
        <button
          type="button"
          className="toolbar-button"
          onClick={onOpenCheatSheet}
        >
          <span>▤</span> Cheat sheet
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => fileInput.current?.click()}
        >
          <span>＋</span> Import Markdown
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={onOpenUrlImport}
        >
          <span>◎</span> Import URL
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={onOpenFolder}
          disabled={folderLoading}
        >
          <span>⌑</span> {folderLoading ? 'Scanning…' : 'Open folder'}
        </button>
        {hasDocument && (
          <button
            type="button"
            className="icon-button"
            onClick={onToggleSearch}
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
          onClick={onOpenSettings}
          aria-label="Open reading settings"
          aria-expanded={settingsOpen}
          aria-controls="reading-settings"
        >
          ☼
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".md,.markdown,text/markdown,text/plain"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onOpenFile(file);
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          hidden
          multiple
          onChange={(event) => {
            if (event.target.files) onFolderFiles(event.target.files);
          }}
        />
      </div>
    </header>
  );
}
