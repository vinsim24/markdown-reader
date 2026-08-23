import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import {
  createDocumentTab,
  documentTabsReducer,
  initialDocumentTabsState,
} from '../lib/documentTabs';
import {
  type FolderWorkspace,
  pickDirectory,
  supportsDirectoryPicker,
  workspaceFromFileList,
} from '../lib/fileAccess';
import { resolveObsidianWikilink } from '../lib/obsidian';
import { resolveMarkdownTarget } from '../lib/paths';

interface DocumentSessionsOptions {
  resetDocumentUi: () => void;
  setDragActive: Dispatch<SetStateAction<boolean>>;
  setFolderLoading: Dispatch<SetStateAction<boolean>>;
  setLinkNotice: Dispatch<SetStateAction<string>>;
}

interface SessionDocument {
  activePath: string;
  markdown: string;
  sourceKey: string;
  title: string;
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
}: DocumentSessionsOptions) {
  const [documents, dispatchDocuments] = useReducer(
    documentTabsReducer,
    initialDocumentTabsState
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

  const rememberActiveScroll = () => {
    if (!activeDocument) return;
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
    if (id === documents.activeId) {
      rememberActiveScroll();
      resetDocumentUi();
    }
    dispatchDocuments({ type: 'close', id });
  };

  const closeAllDocuments = () => {
    dispatchDocuments({ type: 'closeAll' });
    resetDocumentUi();
    updateDocumentLocation();
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    window.scrollTo({ top: activeDocument?.scrollTop || 0 });
  }, [activeDocument?.id]);

  const openFile = (file: File) => {
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
          markdown: String(reader.result),
          sourceKey: `file:${file.name}:${file.size}:${file.lastModified}`,
          title: file.name,
        }),
      });
      setLinkNotice(`Opened ${file.name}`);
    };
    reader.readAsText(file);
  };

  const openSessionDocument = (document: SessionDocument) => {
    rememberActiveScroll();
    resetDocumentUi();
    dispatchDocuments({
      type: 'open',
      tab: createDocumentTab(document),
    });
    setLinkNotice(`Opened ${document.title}`);
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
    rememberActiveScroll();
    resetDocumentUi();
    if (existing) dispatchDocuments({ type: 'select', id: existing.id });
    else if (disposition === 'current' && activeDocument) {
      dispatchDocuments({
        type: 'update',
        id: activeDocument.id,
        changes: {
          activePath: path,
          folder: workspace,
          markdown: await file.text(),
          scrollTop: 0,
          sourceKey,
          title: path.split('/').at(-1) || path,
        },
      });
    } else {
      dispatchDocuments({
        type: 'open',
        tab: createDocumentTab({
          activePath: path,
          folder: workspace,
          markdown: await file.text(),
          sourceKey,
          title: path.split('/').at(-1) || path,
        }),
      });
    }
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
        markdown: await file.text(),
        sourceKey: `folder:${workspace.id}:${first}`,
        title: first.split('/').at(-1) || first,
      }),
    });
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
    openFile,
    openSessionDocument,
    openFolder,
    openFolderFile,
    openRelativeLink,
    selectDocumentTab,
    workspaceFromFileList,
  };
}
