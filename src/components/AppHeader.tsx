import { FileArrowUpIcon as FileArrowUp } from '@phosphor-icons/react/FileArrowUp';
import { FolderOpenIcon as FolderOpen } from '@phosphor-icons/react/FolderOpen';
import { ListIcon as List } from '@phosphor-icons/react/List';
import { MagnifyingGlassIcon as MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass';
import { SlidersHorizontalIcon as SlidersHorizontal } from '@phosphor-icons/react/SlidersHorizontal';
import type { MouseEvent, RefObject } from 'react';
import BrandMark from './BrandMark';
import SourceMenu from './SourceMenu';

interface AppHeaderProps {
  fileInput: RefObject<HTMLInputElement | null>;
  folderInputRef: (element: HTMLInputElement | null) => void;
  folderLoading: boolean;
  hasDocument: boolean;
  navOpen: boolean;
  navTrigger: RefObject<HTMLButtonElement | null>;
  onCloseAll: () => void;
  onOpenCheatSheet: () => void;
  onOpenObsidianGuide: () => void;
  onOpenMarkmapExamples: () => void;
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
  onOpenObsidianGuide,
  onOpenMarkmapExamples,
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
        <BrandMark />
        <span>Markdown Reader</span>
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
            <List size={19} weight="bold" aria-hidden="true" />
          </button>
        )}
        {hasDocument && (
          <>
            <button
              type="button"
              className="toolbar-button header-primary-action"
              onClick={() => fileInput.current?.click()}
            >
              <FileArrowUp size={16} weight="bold" aria-hidden="true" />
              Import Markdown
            </button>
            <button
              type="button"
              className="toolbar-button header-folder-action"
              onClick={onOpenFolder}
              disabled={folderLoading}
            >
              <FolderOpen size={16} aria-hidden="true" />
              {folderLoading ? 'Scanning...' : 'Open folder'}
            </button>
            <SourceMenu
              onOpenCheatSheet={onOpenCheatSheet}
              onOpenMarkmapExamples={onOpenMarkmapExamples}
              onOpenObsidianGuide={onOpenObsidianGuide}
              onOpenUrlImport={onOpenUrlImport}
            />
          </>
        )}
        {hasDocument && (
          <button
            type="button"
            className="icon-button"
            onClick={onToggleSearch}
            aria-label="Search document"
            aria-expanded={searchOpen}
            aria-controls="document-search"
          >
            <MagnifyingGlass size={18} aria-hidden="true" />
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
          <SlidersHorizontal size={18} aria-hidden="true" />
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
