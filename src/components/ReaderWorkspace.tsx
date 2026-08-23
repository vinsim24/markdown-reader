import { BookOpenTextIcon as BookOpenText } from '@phosphor-icons/react/BookOpenText';
import { ColumnsIcon as Columns } from '@phosphor-icons/react/Columns';
import { CornersOutIcon as CornersOut } from '@phosphor-icons/react/CornersOut';
import { PencilSimpleLineIcon as PencilSimpleLine } from '@phosphor-icons/react/PencilSimpleLine';
import { TextAaIcon as TextAa } from '@phosphor-icons/react/TextAa';
import { TreeStructureIcon as TreeStructure } from '@phosphor-icons/react/TreeStructure';
import type { MouseEvent } from 'react';
import {
  type DocumentTab,
  type DocumentViewMode,
  type EditorSelection,
} from '../lib/documentTabs';
import type { DocumentHeading } from '../lib/headings';
import type { Theme } from '../lib/preferences';
import DocumentEditorWorkspace from './DocumentEditorWorkspace';
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
  onEditorChange: (
    id: string,
    markdown: string,
    selection: EditorSelection
  ) => void;
  onEditorScroll: (id: string, scrollTop: number) => void;
  onPreviewScroll: (id: string, scrollTop: number) => void;
  onSplitRatioChange: (id: string, splitRatio: number) => void;
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
  onSetViewMode: (viewMode: DocumentViewMode) => void;
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
  onEditorChange,
  onEditorScroll,
  onPreviewScroll,
  onSplitRatioChange,
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
  onSetViewMode,
  words,
}: ReaderWorkspaceProps) {
  const hasDocument = activeDocument !== undefined;
  const viewMode = activeDocument?.viewMode ?? 'reader';
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
                <fieldset className="view-toggle" aria-label="Document view">
                  <button
                    type="button"
                    aria-label="Preview"
                    aria-pressed={viewMode === 'reader'}
                    onClick={() => onSetViewMode('reader')}
                  >
                    <BookOpenText size={14} aria-hidden="true" />
                    <span>Preview</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Write"
                    aria-pressed={viewMode === 'editor'}
                    onClick={() => onSetViewMode('editor')}
                  >
                    <PencilSimpleLine size={14} aria-hidden="true" />
                    <span>Write</span>
                  </button>
                  <button
                    type="button"
                    className="split-action"
                    aria-label="Split"
                    aria-pressed={viewMode === 'split'}
                    onClick={() => onSetViewMode('split')}
                  >
                    <Columns size={14} aria-hidden="true" />
                    <span>Split</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Mind map"
                    aria-pressed={viewMode === 'mindmap'}
                    onClick={() => onSetViewMode('mindmap')}
                  >
                    <TreeStructure size={14} aria-hidden="true" />
                    <span>Mind map</span>
                  </button>
                </fieldset>
                {viewMode === 'reader' && (
                  <button
                    type="button"
                    className="subtle-button focus-action"
                    onClick={onEnterFocus}
                  >
                    <CornersOut size={14} aria-hidden="true" />
                    <span>Focus mode</span>
                  </button>
                )}
                <button
                  type="button"
                  className="subtle-button reading-action"
                  onClick={onOpenSettings}
                >
                  <TextAa size={15} aria-hidden="true" />
                  <span>Reading</span>
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
                    : 'Ctrl K'}
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
            ) : viewMode === 'mindmap' ? (
              <MarkmapView
                fileName={activeDocument.title}
                markdown={activeDocument.markdown}
                theme={theme}
              />
            ) : (
              <DocumentEditorWorkspace
                activeDocument={activeDocument}
                mode={viewMode}
                onEditorChange={onEditorChange}
                onEditorScroll={onEditorScroll}
                onPreviewScroll={onPreviewScroll}
                onRelativeLink={onRelativeLink}
                onSplitRatioChange={onSplitRatioChange}
                theme={theme}
              />
            )}
            {(viewMode === 'reader' || viewMode === 'mindmap') && (
              <footer className="reader-footer">
                <span>End of document</span>
                <span>•</span>
                <span>Markdown Reader</span>
              </footer>
            )}
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
