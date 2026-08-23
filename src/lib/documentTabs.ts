import type { FolderWorkspace } from './fileAccess';

export interface DocumentTab {
  activePath: string;
  folder?: FolderWorkspace;
  id: string;
  markdown: string;
  scrollTop: number;
  sourceKey: string;
  title: string;
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

let tabSequence = 0;

export function createDocumentTab(
  document: Omit<DocumentTab, 'id' | 'scrollTop'>
): DocumentTab {
  tabSequence += 1;
  return { ...document, id: `document-tab-${tabSequence}`, scrollTop: 0 };
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
