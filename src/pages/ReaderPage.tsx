import { useEffect, useMemo } from 'react';
import AppHeader from '../components/AppHeader';
import DocumentTabs from '../components/DocumentTabs';
import ReaderOverlays from '../components/ReaderOverlays';
import ReaderWorkspace from '../components/ReaderWorkspace';
import cheatSheetMarkdown from '../content/MarkdownCheatSheet.md?raw';
import obsidianCheatSheetMarkdown from '../content/ObsidianCheatSheet.md?raw';
import markmapExamplesMarkdown from '../content/MarkmapExamples.md?raw';
import { useActiveHeading } from '../hooks/useActiveHeading';
import { useDocumentSessions } from '../hooks/useDocumentSessions';
import { useReaderUi } from '../hooks/useReaderUi';
import { useReadingPreferences } from '../hooks/useReadingPreferences';
import { extractHeadings } from '../lib/headings';
import { fetchRemoteMarkdown } from '../lib/remoteMarkdown';

export default function ReaderPage() {
  const ui = useReaderUi();
  const reading = useReadingPreferences();
  const sessions = useDocumentSessions({
    resetDocumentUi: ui.resetDocumentUi,
    setDragActive: ui.setDragActive,
    setFolderLoading: ui.setFolderLoading,
    setLinkNotice: ui.setLinkNotice,
    showTransientNotice: ui.showTransientNotice,
  });
  const { activeHeading, setActiveHeading } = useActiveHeading(
    sessions.markdown,
    ui.focusMode
  );
  const headings = useMemo(
    () => extractHeadings(sessions.markdown),
    [sessions.markdown]
  );
  const words = sessions.markdown.trim()
    ? sessions.markdown.trim().split(/\s+/).length
    : 0;
  const readingMinutes = words ? Math.max(1, Math.ceil(words / 225)) : 0;
  const hasDocument = sessions.activeDocument !== undefined;

  useEffect(() => {
    if (!window.matchMedia || !sessions.activeDocument) return;
    const phone = window.matchMedia('(max-width: 640px)');
    const leaveSplitOnPhone = () => {
      if (phone.matches && sessions.activeDocument?.viewMode === 'split') {
        sessions.setDocumentViewMode(sessions.activeDocument.id, 'reader');
      }
    };
    leaveSplitOnPhone();
    phone.addEventListener('change', leaveSplitOnPhone);
    return () => phone.removeEventListener('change', leaveSplitOnPhone);
  }, [sessions.activeDocument?.id, sessions.activeDocument?.viewMode]);

  const closeAllDocuments = () => {
    if (sessions.closeAllDocuments()) ui.setFocusMode(false);
  };
  const openCheatSheet = () => {
    sessions.openSessionDocument({
      activePath: 'Markdown Cheat Sheet.md',
      markdown: cheatSheetMarkdown,
      sourceKey: 'bundled:markdown-cheat-sheet',
      title: 'Markdown Cheat Sheet.md',
    });
  };
  const openObsidianGuide = () => {
    sessions.openSessionDocument({
      activePath: 'Obsidian Markdown Guide.md',
      markdown: obsidianCheatSheetMarkdown,
      sourceKey: 'bundled:obsidian-markdown-guide',
      title: 'Obsidian Markdown Guide.md',
    });
  };
  const openMarkmapExamples = () => {
    sessions.openSessionDocument({
      activePath: 'Markmap Examples.md',
      markdown: markmapExamplesMarkdown,
      sourceKey: 'bundled:markmap-examples',
      title: 'Markmap Examples.md',
      viewMode: 'mindmap',
    });
    ui.setSearchOpen(false);
  };
  const importFromUrl = async (url: string) => {
    const document = await fetchRemoteMarkdown(url);
    sessions.openSessionDocument({
      activePath: document.title,
      markdown: document.markdown,
      sourceKey: `remote:${document.sourceUrl}`,
      title: document.title,
    });
    ui.setUrlImportOpen(false);
  };

  return (
    <div
      className={`app-shell theme-${reading.preferences.theme} font-${reading.preferences.font} code-${reading.preferences.codeTheme}${ui.focusMode ? ' focus-mode' : ''}`}
      style={reading.style}
    >
      {ui.dragActive && (
        <div className="drop-overlay" role="status">
          Drop a Markdown file to open it
        </div>
      )}
      <AppHeader
        fileInput={sessions.input}
        folderInputRef={sessions.configureFolderInput}
        folderLoading={ui.folderLoading}
        hasDocument={hasDocument}
        navOpen={ui.nav}
        navTrigger={ui.navTrigger}
        onCloseAll={closeAllDocuments}
        onOpenCheatSheet={openCheatSheet}
        onOpenObsidianGuide={openObsidianGuide}
        onOpenMarkmapExamples={openMarkmapExamples}
        onFolderFiles={(files) =>
          sessions.activateFolder(sessions.workspaceFromFileList(files))
        }
        onOpenFile={sessions.openFile}
        onOpenFolder={sessions.openFolder}
        onOpenNav={() => {
          ui.setNav(true);
          ui.setSettings(false);
        }}
        onOpenSettings={ui.openSettings}
        onOpenUrlImport={ui.openUrlImport}
        onToggleSearch={() => ui.setSearchOpen(!ui.searchOpen)}
        searchEnabled={sessions.activeDocument?.viewMode === 'reader'}
        searchOpen={ui.searchOpen}
        settingsOpen={ui.settings}
      />
      {sessions.activeDocument && (
        <DocumentTabs
          activeId={sessions.activeDocument.id}
          onClose={sessions.closeDocumentTab}
          onOpen={() => sessions.input.current?.click()}
          onSelect={sessions.selectDocumentTab}
          tabs={sessions.documents.tabs}
        />
      )}
      <ReaderWorkspace
        activeDocument={sessions.activeDocument}
        activeHeading={activeHeading}
        folderLoading={ui.folderLoading}
        headings={headings}
        linkNotice={ui.linkNotice}
        navOpen={ui.nav}
        onDismissNotice={ui.dismissLinkNotice}
        onEditorChange={sessions.updateEditorDocument}
        onEditorScroll={sessions.updateEditorScroll}
        onPreviewScroll={sessions.updatePreviewScroll}
        onSplitRatioChange={sessions.updateSplitRatio}
        onEnterFocus={() => {
          ui.setFocusMode(true);
          ui.setNav(false);
          ui.setSettings(false);
          ui.setSearchOpen(false);
        }}
        onHeadingSelect={(id) => {
          setActiveHeading(id);
          ui.setNav(false);
        }}
        onOpenFile={() => sessions.input.current?.click()}
        onOpenCheatSheet={openCheatSheet}
        onOpenObsidianGuide={openObsidianGuide}
        onOpenMarkmapExamples={openMarkmapExamples}
        onOpenFolder={sessions.openFolder}
        onOpenFolderFile={sessions.openFolderFile}
        onOpenSettings={ui.openSettings}
        onOpenUrlImport={ui.openUrlImport}
        onRelativeLink={sessions.openRelativeLink}
        onSetNav={ui.setNav}
        onSetSearch={ui.setSearch}
        onSetViewMode={(viewMode) => {
          if (!sessions.activeDocument) return;
          sessions.setDocumentViewMode(sessions.activeDocument.id, viewMode);
          if (viewMode !== 'reader') ui.setSearchOpen(false);
          if (viewMode === 'editor' || viewMode === 'split') {
            ui.setFocusMode(false);
          }
        }}
        readingMinutes={readingMinutes}
        search={ui.search}
        searchOpen={ui.searchOpen}
        theme={reading.preferences.theme}
        words={words}
      />
      <ReaderOverlays
        focusMode={ui.focusMode}
        hasDocument={hasDocument}
        lowContrast={reading.lowContrast}
        navOpen={ui.nav}
        navTrigger={ui.navTrigger}
        onCloseSettings={ui.closeSettings}
        onExitFocus={() => ui.setFocusMode(false)}
        onCloseUrlImport={ui.closeUrlImport}
        onImportUrl={importFromUrl}
        onResetPreferences={reading.resetPreferences}
        onSetCustomColor={reading.setCustomColor}
        onSetNav={ui.setNav}
        onSetSettings={ui.setSettings}
        preferences={reading.preferences}
        selectedColors={reading.selectedColors}
        setPreferences={reading.setPreferences}
        settingsOpen={ui.settings}
        settingsPanel={ui.settingsPanel}
        settingsReturnFocus={ui.settingsReturnFocus}
        urlImportOpen={ui.urlImportOpen}
        urlImportReturnFocus={ui.urlImportReturnFocus}
      />
    </div>
  );
}
