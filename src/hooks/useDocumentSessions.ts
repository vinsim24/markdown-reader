import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  createDocumentTab,
  type DocumentViewMode,
  documentTabsReducer,
  type EditorSelection,
  initialEditorSelection,
  initialDocumentTabsState,
  isDocumentDirty,
} from '../lib/documentTabs';
import {
  type FolderWorkspace,
  fileVersion,
  type FileHandleLike,
  pickFile,
  pickDirectory,
  sameFileVersion,
  supportsFilePicker,
  supportsDirectoryPicker,
  workspaceFromFileList,
} from '../lib/fileAccess';
import {
  clearRecentDocuments,
  forgetRecentDocument,
  loadRecentDocuments,
  type RecentDocument,
  rememberRecentDocument,
} from '../lib/recentDocuments';
import { resolveObsidianWikilink } from '../lib/obsidian';
import { resolveMarkdownTarget } from '../lib/paths';

interface DocumentSessionsOptions {
  resetDocumentUi: () => void;
  setDragActive: Dispatch<SetStateAction<boolean>>;
  setFolderLoading: Dispatch<SetStateAction<boolean>>;
  setLinkNotice: Dispatch<SetStateAction<string>>;
  showTransientNotice: (message: string) => void;
}

interface SessionDocument {
  activePath: string;
  markdown: string;
  sourceKey: string;
  title: string;
  viewMode?: DocumentViewMode;
  sourceType?: 'bundled' | 'remote';
}

function decodePathSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function updateDocumentLocation(query = '', anchor = '') {
  const searchPart = query ? `?${query}` : '';
  const hashPart = anchor
    ? `#${encodeURIComponent(decodePathSafe(anchor))}`
    : '';
  history.replaceState(
    null,
    '',
    `${location.pathname}${searchPart}${hashPart}`
  );
}

export function useDocumentSessions({
  resetDocumentUi,
  setDragActive,
  setFolderLoading,
  setLinkNotice,
  showTransientNotice,
}: DocumentSessionsOptions) {
  const [documents, dispatchDocuments] = useReducer(
    documentTabsReducer,
    initialDocumentTabsState
  );
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [rememberFileAccess, setRememberFileAccessState] = useState(
    () => localStorage.getItem('markdown-reader:remember-file-access') === 'true'
  );
  const dragDepth = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const activeDocument = documents.tabs.find(
    (tab) => tab.id === documents.activeId
  );
  const markdown = activeDocument?.markdown || '';
  const folder = activeDocument?.folder;
  const activePath = activeDocument?.activePath || '';

  useEffect(() => {
    void loadRecentDocuments().then((entries) => {
      if (rememberFileAccess) setRecentDocuments(entries);
      else {
        const metadataOnly = entries.map((entry) => ({
          ...entry,
          handle: undefined,
        }));
        setRecentDocuments(metadataOnly);
        for (const entry of metadataOnly) void rememberRecentDocument(entry);
      }
    });
  }, []);

  const rememberRecent = (entry: Omit<RecentDocument, 'lastOpened'>) => {
    const recent = { ...entry, lastOpened: Date.now() };
    setRecentDocuments((current) =>
      [recent, ...current.filter((item) => item.id !== recent.id)].slice(0, 20)
    );
    void rememberRecentDocument(
      rememberFileAccess ? recent : { ...recent, handle: undefined }
    );
  };

  const setRememberFileAccess = (enabled: boolean) => {
    setRememberFileAccessState(enabled);
    localStorage.setItem(
      'markdown-reader:remember-file-access',
      String(enabled)
    );
    for (const recent of recentDocuments) {
      void rememberRecentDocument(
        enabled ? recent : { ...recent, handle: undefined }
      );
    }
  };

  const rememberActiveScroll = () => {
    if (
      !activeDocument ||
      activeDocument.viewMode === 'editor' ||
      activeDocument.viewMode === 'split'
    ) {
      return;
    }
    dispatchDocuments({
      type: 'update',
      id: activeDocument.id,
      changes: { scrollTop: window.scrollY },
    });
  };

  const selectDocumentTab = (id: string) => {
    if (id === documents.activeId) return;
    rememberActiveScroll();
    resetDocumentUi();
    dispatchDocuments({ type: 'select', id });
  };

  const closeDocumentTab = (id: string) => {
    const document = documents.tabs.find((tab) => tab.id === id);
    if (
      document &&
      isDocumentDirty(document) &&
      !window.confirm(`Discard unsaved changes to ${document.title}?`)
    ) {
      return false;
    }
    if (id === documents.activeId) {
      rememberActiveScroll();
      resetDocumentUi();
    }
    dispatchDocuments({ type: 'close', id });
    return true;
  };

  const closeAllDocuments = () => {
    const dirtyCount = documents.tabs.filter(isDocumentDirty).length;
    if (
      dirtyCount > 0 &&
      !window.confirm(
        `Discard unsaved changes in ${dirtyCount} document${dirtyCount === 1 ? '' : 's'}?`
      )
    ) {
      return false;
    }
    dispatchDocuments({ type: 'closeAll' });
    resetDocumentUi();
    updateDocumentLocation();
    window.scrollTo({ top: 0 });
    return true;
  };

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!documents.tabs.some(isDocumentDirty)) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [documents.tabs]);

  useEffect(() => {
    window.scrollTo({
      top:
        activeDocument?.viewMode === 'editor' ||
        activeDocument?.viewMode === 'split'
          ? 0
          : activeDocument?.scrollTop || 0,
    });
  }, [activeDocument?.id, activeDocument?.viewMode]);

  const openFile = (file: File, fileHandle?: FileHandleLike) => {
    if (!/\.(md|markdown)$/i.test(file.name)) {
      setLinkNotice(
        'Choose a .md or .markdown file. Other file types are not supported.'
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      rememberActiveScroll();
      resetDocumentUi();
      dispatchDocuments({
        type: 'open',
        tab: createDocumentTab({
          activePath: file.name,
          diskVersion: fileVersion(file),
          fileHandle,
          markdown: String(reader.result),
          sourceKey: `file:${file.name}:${file.size}:${file.lastModified}`,
          title: file.name,
          sourceType: 'file',
        }),
      });
      rememberRecent({
        handle: fileHandle,
        id: fileHandle ? `handle:${file.name}` : `snapshot:${file.name}`,
        sourceType: 'file',
        title: file.name,
      });
      showTransientNotice(`Opened ${file.name}`);
    };
    reader.readAsText(file);
  };

  const openFilePicker = async () => {
    if (!supportsFilePicker()) {
      input.current?.click();
      return;
    }
    try {
      const selected = await pickFile();
      if (selected) openFile(selected.file, selected.handle);
    } catch {
      setLinkNotice('The file could not be opened. Check its permissions and try again.');
    }
  };

  const openSessionDocument = (document: SessionDocument) => {
    rememberActiveScroll();
    resetDocumentUi();
    dispatchDocuments({
      type: 'open',
      tab: createDocumentTab(document),
    });
    rememberRecent({
      id: document.sourceKey,
      sourceType: document.sourceType ?? (document.sourceKey.startsWith('remote:') ? 'remote' : 'bundled'),
      sourceUrl: document.sourceKey.startsWith('remote:')
        ? document.sourceKey.slice('remote:'.length)
        : undefined,
      title: document.title,
    });
    showTransientNotice(`Opened ${document.title}`);
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
    const drop = (event: DragEvent) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragActive(false);
      const file = event.dataTransfer?.files[0];
      if (file) openFile(file);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  });

  const openFolderFile = async (
    path: string,
    anchor = '',
    query = '',
    disposition: 'tab' | 'current' = 'tab'
  ) => {
    const workspace = folder;
    if (!workspace) return;
    const file = workspace.files.get(path);
    if (!file) return;
    const sourceKey = `folder:${workspace.id}:${path}`;
    const existing = documents.tabs.find((tab) => tab.sourceKey === sourceKey);
    if (existing) {
      rememberActiveScroll();
      resetDocumentUi();
      dispatchDocuments({ type: 'select', id: existing.id });
    } else if (disposition === 'current' && activeDocument) {
      if (
        isDocumentDirty(activeDocument) &&
        !window.confirm(`Discard unsaved changes to ${activeDocument.title}?`)
      ) {
        return;
      }
      rememberActiveScroll();
      resetDocumentUi();
      const markdown = await file.text();
      dispatchDocuments({
        type: 'update',
        id: activeDocument.id,
        changes: {
          activePath: path,
          editorScrollTop: 0,
          editorSelection: initialEditorSelection,
          folder: workspace,
          fileHandle: workspace.handles.get(path),
          diskVersion: fileVersion(file),
          markdown,
          originalMarkdown: markdown,
          previewScrollTop: 0,
          scrollTop: 0,
          splitRatio: 50,
          sourceKey,
          title: path.split('/').at(-1) || path,
          sourceType: 'folder',
          viewMode: 'reader',
        },
      });
    } else {
      rememberActiveScroll();
      resetDocumentUi();
      dispatchDocuments({
        type: 'open',
        tab: createDocumentTab({
          activePath: path,
          folder: workspace,
          fileHandle: workspace.handles.get(path),
          diskVersion: fileVersion(file),
          markdown: await file.text(),
          sourceKey,
          title: path.split('/').at(-1) || path,
          sourceType: 'folder',
        }),
      });
    }
    showTransientNotice(`Opened ${path}`);
    rememberRecent({
      handle: workspace.handles.get(path),
      id: `folder:${workspace.name}:${path}`,
      sourceType: 'folder',
      title: path.split('/').at(-1) || path,
    });
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
    if (workspace.markdownPaths.length === 0) {
      setLinkNotice(`No Markdown files were found in ${workspace.name}.`);
      return;
    }
    const first = workspace.markdownPaths[0];
    const file = workspace.files.get(first);
    if (!file) return;
    rememberActiveScroll();
    resetDocumentUi();
    dispatchDocuments({
      type: 'open',
      tab: createDocumentTab({
        activePath: first,
        folder: workspace,
        fileHandle: workspace.handles.get(first),
        diskVersion: fileVersion(file),
        markdown: await file.text(),
        sourceKey: `folder:${workspace.id}:${first}`,
        title: first.split('/').at(-1) || first,
        sourceType: 'folder',
      }),
    });
    showTransientNotice(`Opened folder ${workspace.name}`);
    rememberRecent({
      handle: workspace.handles.get(first),
      id: `folder:${workspace.name}:${first}`,
      sourceType: 'folder',
      title: first.split('/').at(-1) || first,
    });
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
    const target =
      resolveObsidianWikilink(href, activePath, folder.markdownPaths) ||
      resolveMarkdownTarget(href, activePath, new Set(folder.markdownPaths));
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
    await openFolderFile(target.path, target.anchor, target.query, 'current');
  };

  const configureFolderInput = (element: HTMLInputElement | null) => {
    (folderInput as MutableRefObject<HTMLInputElement | null>).current =
      element;
    element?.setAttribute('webkitdirectory', '');
    element?.setAttribute('directory', '');
  };

  const setDocumentViewMode = (id: string, viewMode: DocumentViewMode) => {
    if (id === documents.activeId) rememberActiveScroll();
    dispatchDocuments({ type: 'update', id, changes: { viewMode } });
  };

  const updateEditorDocument = (
    id: string,
    markdown: string,
    editorSelection: EditorSelection
  ) => {
    dispatchDocuments({
      type: 'update',
      id,
      changes: { editorSelection, markdown },
    });
  };

  const updateEditorScroll = (id: string, editorScrollTop: number) => {
    dispatchDocuments({
      type: 'update',
      id,
      changes: { editorScrollTop },
    });
  };

  const updatePreviewScroll = (id: string, scrollTop: number) => {
    dispatchDocuments({
      type: 'update',
      id,
      changes: { previewScrollTop: scrollTop },
    });
  };

  const updateSplitRatio = (id: string, splitRatio: number) => {
    dispatchDocuments({
      type: 'update',
      id,
      changes: { splitRatio },
    });
  };

  const verifyPermission = async (
    handle: FileHandleLike,
    write: boolean,
    request: boolean
  ) => {
    const options = { mode: write ? 'readwrite' : 'read' } as const;
    if (!handle.queryPermission) return !write || Boolean(handle.createWritable);
    if ((await handle.queryPermission(options)) === 'granted') return true;
    return Boolean(
      request &&
        handle.requestPermission &&
        (await handle.requestPermission(options)) === 'granted'
    );
  };

  const refreshDocument = async (document = activeDocument, announce = true) => {
    if (!document?.fileHandle) {
      if (announce) setLinkNotice('Locate this file again to refresh it.');
      return;
    }
    try {
      if (!(await verifyPermission(document.fileHandle, false, false))) {
        if (announce) setLinkNotice('File access is required before checking for changes.');
        return;
      }
      const file = await document.fileHandle.getFile();
      const nextVersion = fileVersion(file);
      if (sameFileVersion(document.diskVersion, nextVersion)) return;
      const nextMarkdown = await file.text();
      if (nextMarkdown === document.originalMarkdown) {
        dispatchDocuments({
          type: 'update',
          id: document.id,
          changes: { diskVersion: nextVersion },
        });
        return;
      }
      if (isDocumentDirty(document)) {
        if (document.externalMarkdown !== nextMarkdown) {
          dispatchDocuments({
            type: 'update',
            id: document.id,
            changes: { externalMarkdown: nextMarkdown },
          });
          setLinkNotice('This file changed on disk while you have unsaved edits.');
        }
        return;
      }
      dispatchDocuments({
        type: 'update',
        id: document.id,
        changes: {
          diskVersion: nextVersion,
          externalMarkdown: undefined,
          markdown: nextMarkdown,
          originalMarkdown: nextMarkdown,
        },
      });
      if (announce) showTransientNotice('Updated from disk');
    } catch {
      if (announce) setLinkNotice('The source file is unavailable. Your open copy is still safe.');
    }
  };

  useEffect(() => {
    if (!activeDocument?.fileHandle) return;
    const check = () => {
      if (document.visibilityState === 'visible') void refreshDocument(activeDocument, false);
    };
    const onVisibilityChange = () => check();
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const interval = window.setInterval(check, 3000);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [
    activeDocument?.id,
    activeDocument?.diskVersion?.lastModified,
    activeDocument?.diskVersion?.size,
    activeDocument?.markdown,
    activeDocument?.originalMarkdown,
    activeDocument?.externalMarkdown,
  ]);

  const reloadExternalDocument = async () => {
    if (!activeDocument?.externalMarkdown) return;
    if (
      isDocumentDirty(activeDocument) &&
      !window.confirm(`Discard your edits and reload ${activeDocument.title} from disk?`)
    ) {
      return;
    }
    const file = await activeDocument.fileHandle?.getFile();
    dispatchDocuments({
      type: 'update',
      id: activeDocument.id,
      changes: {
        diskVersion: file ? fileVersion(file) : activeDocument.diskVersion,
        externalMarkdown: undefined,
        markdown: activeDocument.externalMarkdown,
        originalMarkdown: activeDocument.externalMarkdown,
      },
    });
    setLinkNotice('');
    showTransientNotice('Reloaded from disk');
  };

  const keepEditedDocument = () => {
    setLinkNotice('Your edits are preserved. Save will confirm before replacing the disk version.');
  };

  const downloadActiveDocument = () => {
    if (!activeDocument) return;
    const blob = new Blob([activeDocument.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = /\.(md|markdown)$/i.test(activeDocument.title)
      ? activeDocument.title
      : `${activeDocument.title}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    showTransientNotice(`Downloaded ${anchor.download}`);
  };

  const writeDocument = async (handle: FileHandleLike) => {
    if (!activeDocument || !handle.createWritable) return false;
    const writable = await handle.createWritable();
    await writable.write(activeDocument.markdown);
    await writable.close();
    const savedFile = await handle.getFile();
    dispatchDocuments({
      type: 'update',
      id: activeDocument.id,
      changes: {
        diskVersion: fileVersion(savedFile),
        externalMarkdown: undefined,
        fileHandle: handle,
        originalMarkdown: activeDocument.markdown,
      },
    });
    rememberRecent({
      handle,
      id: `handle:${handle.name}`,
      sourceType: 'file',
      title: handle.name,
    });
    setLinkNotice('');
    showTransientNotice(`Saved ${handle.name}`);
    return true;
  };

  const saveAsActiveDocument = async () => {
    if (!activeDocument) return;
    const picker = (
      window as typeof window & {
        showSaveFilePicker?: (options?: unknown) => Promise<FileHandleLike>;
      }
    ).showSaveFilePicker;
    if (!picker) {
      downloadActiveDocument();
      return;
    }
    try {
      const handle = await picker({
        suggestedName: activeDocument.title,
        types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown'] } }],
      });
      await writeDocument(handle);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setLinkNotice('The file could not be saved. Your edits are still open.');
      }
    }
  };

  const saveActiveDocument = async () => {
    if (!activeDocument) return;
    const handle = activeDocument.fileHandle;
    if (!handle?.createWritable) {
      await saveAsActiveDocument();
      return;
    }
    try {
      if (!(await verifyPermission(handle, true, true))) {
        setLinkNotice('Write permission was not granted. Your edits are still open.');
        return;
      }
      const diskFile = await handle.getFile();
      const changedOnDisk =
        activeDocument.externalMarkdown !== undefined ||
        !sameFileVersion(activeDocument.diskVersion, fileVersion(diskFile));
      if (
        changedOnDisk &&
        !window.confirm(`The disk copy of ${activeDocument.title} changed. Replace it with your edits?`)
      ) {
        return;
      }
      await writeDocument(handle);
    } catch {
      setLinkNotice('The file could not be saved. Your edits are still open.');
    }
  };

  useEffect(() => {
    const saveShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
      if (!activeDocument || !isDocumentDirty(activeDocument)) return;
      event.preventDefault();
      void saveActiveDocument();
    };
    window.addEventListener('keydown', saveShortcut);
    return () => window.removeEventListener('keydown', saveShortcut);
  }, [activeDocument]);

  const openRecentDocument = async (recent: RecentDocument) => {
    if (!recent.handle) return false;
    try {
      if (!(await verifyPermission(recent.handle, false, true))) return false;
      openFile(await recent.handle.getFile(), recent.handle);
      return true;
    } catch {
      setLinkNotice('That recent file is unavailable. Locate it again or remove it from history.');
      return false;
    }
  };

  const removeRecentDocument = (id: string) => {
    setRecentDocuments((current) => current.filter((item) => item.id !== id));
    void forgetRecentDocument(id);
  };

  const clearRecent = () => {
    setRecentDocuments([]);
    void clearRecentDocuments();
  };

  return {
    activateFolder,
    activeDocument,
    activePath,
    closeAllDocuments,
    closeDocumentTab,
    configureFolderInput,
    documents,
    folder,
    input,
    markdown,
    recentDocuments,
    rememberFileAccess,
    clearRecent,
    downloadActiveDocument,
    keepEditedDocument,
    openFile,
    openFilePicker,
    openRecentDocument,
    openSessionDocument,
    openFolder,
    openFolderFile,
    openRelativeLink,
    refreshActiveDocument: () => refreshDocument(activeDocument, true),
    reloadExternalDocument,
    removeRecentDocument,
    saveActiveDocument,
    saveAsActiveDocument,
    setRememberFileAccess,
    selectDocumentTab,
    setDocumentViewMode,
    updateEditorDocument,
    updateEditorScroll,
    updatePreviewScroll,
    updateSplitRatio,
    workspaceFromFileList,
  };
}
