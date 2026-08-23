import type { MouseEvent } from 'react';
import type { DocumentTab } from '../lib/documentTabs';
import type { DocumentHeading } from '../lib/headings';
import type { Theme } from '../lib/preferences';
import MarkdownDocument from './MarkdownDocument';
import MarkmapView from './MarkmapView';
import ReaderSidebar from './ReaderSidebar';
import StatusNotice from './StatusNotice';
import WelcomeView from './WelcomeView';

interface ReaderWorkspaceProps {
  activeDocument?: DocumentTab;
  activeHeading: string;
  folderLoading: boolean;
  headings: DocumentHeading[];
  linkNotice: string;
  navOpen: boolean;
  onDismissNotice: () => void;
  onEnterFocus: () => void;
  onHeadingSelect: (id: string) => void;
  onOpenFile: () => void;
  onOpenCheatSheet: () => void;
  onOpenFolder: () => void;
  onOpenObsidianGuide: () => void;
  onOpenMarkmapExamples: () => void;
  onOpenFolderFile: (
    path: string,
    anchor?: string,
    query?: string
  ) => Promise<void>;
  onOpenSettings: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpenUrlImport: (event: MouseEvent<HTMLButtonElement>) => void;
  onRelativeLink: (href: string) => Promise<void>;
  onSetNav: (open: boolean) => void;
  onSetSearch: (search: string) => void;
  readingMinutes: number;
  search: string;
  searchOpen: boolean;
  theme: Theme;
  viewMode: 'reader' | 'mindmap';
  onSetViewMode: (viewMode: 'reader' | 'mindmap') => void;
  words: number;
}

function searchMatchCount(markdown: string, search: string) {
  if (!search) return 0;
  const escaped = search.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (markdown.toLowerCase().match(new RegExp(escaped, 'g')) || []).length;
}

export default function ReaderWorkspace({
  activeDocument,
  activeHeading,
  folderLoading,
  headings,
  linkNotice,
  navOpen,
  onDismissNotice,
  onEnterFocus,
  onHeadingSelect,
  onOpenFile,
  onOpenCheatSheet,
  onOpenFolder,
  onOpenObsidianGuide,
  onOpenMarkmapExamples,
  onOpenFolderFile,
  onOpenSettings,
  onOpenUrlImport,
  onRelativeLink,
  onSetNav,
  onSetSearch,
  readingMinutes,
  search,
  searchOpen,
  theme,
  viewMode,
  onSetViewMode,
  words,
}: ReaderWorkspaceProps) {
  const hasDocument = activeDocument !== undefined;
  return (
    <div className={`workspace${hasDocument ? '' : ' empty-workspace'}`}>
      {activeDocument && (
        <ReaderSidebar
          activeHeading={activeHeading}
          activePath={activeDocument.activePath}
          fileName={activeDocument.title}
          folder={activeDocument.folder}
          headings={headings}
          navOpen={navOpen}
          onClose={() => onSetNav(false)}
          onHeadingSelect={onHeadingSelect}
          onOpenFile={onOpenFolderFile}
          readingMinutes={readingMinutes}
          words={words}
        />
      )}
      <main
        className="main-area"
        id={activeDocument ? 'reader-document-panel' : undefined}
        aria-labelledby={
          activeDocument ? `tab-${activeDocument.id}` : undefined
        }
      >
        {activeDocument ? (
          <>
            <div className="reader-toolbar">
              <div className="breadcrumbs">
                <span>Documents</span>
                <span>/</span>
                <strong>{activeDocument.title}</strong>
              </div>
              <div className="reader-actions">
                <div className="view-toggle" aria-label="Document view">
                  <button
                    type="button"
                    aria-pressed={viewMode === 'reader'}
                    onClick={() => onSetViewMode('reader')}
                  >
                    Reader
                  </button>
                  <button
                    type="button"
                    aria-pressed={viewMode === 'mindmap'}
                    onClick={() => onSetViewMode('mindmap')}
                  >
                    Mind map
                  </button>
                </div>
                <button
                  type="button"
                  className="subtle-button"
                  onClick={onEnterFocus}
                >
                  Focus mode
                </button>
                <button
                  type="button"
                  className="subtle-button"
                  onClick={onOpenSettings}
                >
                  Aa&nbsp; Reading
                </button>
              </div>
            </div>
            {searchOpen && viewMode === 'reader' && (
              <div id="document-search" className="search-panel open">
                <input
                  aria-label="Search this document"
                  placeholder="Search this document…"
                  value={search}
                  onChange={(event) => onSetSearch(event.target.value)}
                />
                <span>
                  {search
                    ? `${searchMatchCount(activeDocument.markdown, search)} matches`
                    : '⌘ K'}
                </span>
              </div>
            )}
            <StatusNotice message={linkNotice} onDismiss={onDismissNotice} />
            {viewMode === 'reader' ? (
              <MarkdownDocument
                activePath={activeDocument.activePath}
                files={activeDocument.folder?.files}
                markdown={activeDocument.markdown}
                onRelativeLink={onRelativeLink}
                search={search}
                theme={theme}
              />
            ) : (
              <MarkmapView
                fileName={activeDocument.title}
                markdown={activeDocument.markdown}
              />
            )}
            <footer className="reader-footer">
              <span>End of document</span>
              <span>•</span>
              <span>Markdown Reader</span>
            </footer>
          </>
        ) : (
          <>
            <StatusNotice message={linkNotice} onDismiss={onDismissNotice} />
            <WelcomeView
              folderLoading={folderLoading}
              onOpenCheatSheet={onOpenCheatSheet}
              onOpenFile={onOpenFile}
              onOpenFolder={onOpenFolder}
              onOpenObsidianGuide={onOpenObsidianGuide}
              onOpenMarkmapExamples={onOpenMarkmapExamples}
              onOpenUrlImport={onOpenUrlImport}
            />
          </>
        )}
      </main>
    </div>
  );
}
