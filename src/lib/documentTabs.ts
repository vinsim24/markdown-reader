import type { FolderWorkspace } from './fileAccess';

export interface EditorSelection {
  anchor: number;
  head: number;
}

export type DocumentViewMode = 'reader' | 'split' | 'mindmap' | 'editor';

export interface DocumentTab {
  activePath: string;
  editorScrollTop: number;
  editorSelection: EditorSelection;
  folder?: FolderWorkspace;
  id: string;
  markdown: string;
  originalMarkdown: string;
  previewScrollTop: number;
  scrollTop: number;
  sourceKey: string;
  splitRatio: number;
  title: string;
  viewMode: DocumentViewMode;
}

export interface DocumentTabInput {
  activePath: string;
  folder?: FolderWorkspace;
  markdown: string;
  sourceKey: string;
  title: string;
  viewMode?: DocumentViewMode;
}

export interface DocumentTabsState {
  activeId?: string;
  tabs: DocumentTab[];
}

export type DocumentTabsAction =
  | { type: 'open'; tab: DocumentTab }
  | { type: 'select'; id: string }
  | { type: 'close'; id: string }
  | { type: 'closeAll' }
  | {
      type: 'update';
      id: string;
      changes: Partial<Omit<DocumentTab, 'id'>>;
    };

export const initialDocumentTabsState: DocumentTabsState = { tabs: [] };

export const initialEditorSelection: EditorSelection = { anchor: 0, head: 0 };

let tabSequence = 0;

export function createDocumentTab(
  document: DocumentTabInput
): DocumentTab {
  tabSequence += 1;
  return {
    ...document,
    editorScrollTop: 0,
    editorSelection: initialEditorSelection,
    id: `document-tab-${tabSequence}`,
    originalMarkdown: document.markdown,
    previewScrollTop: 0,
    scrollTop: 0,
    splitRatio: 50,
    viewMode: document.viewMode ?? 'reader',
  };
}

export function isDocumentDirty(tab: DocumentTab) {
  return tab.markdown !== tab.originalMarkdown;
}

export function documentTabsReducer(
  state: DocumentTabsState,
  action: DocumentTabsAction
): DocumentTabsState {
  switch (action.type) {
    case 'open': {
      const existing = state.tabs.find(
        (tab) => tab.sourceKey === action.tab.sourceKey
      );
      if (existing) {
        if (isDocumentDirty(existing)) {
          return { ...state, activeId: existing.id };
        }
        return {
          tabs: state.tabs.map((tab) =>
            tab.id === existing.id ? { ...action.tab, id: tab.id } : tab
          ),
          activeId: existing.id,
        };
      }
      return {
        tabs: [...state.tabs, action.tab],
        activeId: action.tab.id,
      };
    }
    case 'select':
      return state.tabs.some((tab) => tab.id === action.id)
        ? { ...state, activeId: action.id }
        : state;
    case 'close': {
      const closingIndex = state.tabs.findIndex((tab) => tab.id === action.id);
      if (closingIndex === -1) return state;
      const tabs = state.tabs.filter((tab) => tab.id !== action.id);
      if (state.activeId !== action.id) return { ...state, tabs };
      const nextTab = tabs[Math.min(closingIndex, tabs.length - 1)];
      return { tabs, activeId: nextTab?.id };
    }
    case 'closeAll':
      return initialDocumentTabsState;
    case 'update':
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.id === action.id ? { ...tab, ...action.changes } : tab
        ),
      };
  }
}
