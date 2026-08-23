import { describe, expect, it } from 'vitest';
import {
  createDocumentTab,
  documentTabsReducer,
  initialDocumentTabsState,
  isDocumentDirty,
} from './documentTabs';

function tab(title: string) {
  return createDocumentTab({
    activePath: title,
    markdown: `# ${title}`,
    sourceKey: `file:${title}`,
    title,
  });
}

describe('documentTabsReducer', () => {
  it('opens documents, activates an existing source, and preserves tab order', () => {
    const first = tab('First.md');
    const second = tab('Second.md');
    let state = documentTabsReducer(initialDocumentTabsState, {
      type: 'open',
      tab: first,
    });
    state = documentTabsReducer(state, { type: 'open', tab: second });
    state = documentTabsReducer(state, {
      type: 'open',
      tab: { ...first, markdown: '# Updated' },
    });

    expect(state.tabs.map((item) => item.title)).toEqual([
      'First.md',
      'Second.md',
    ]);
    expect(state.tabs[0].markdown).toBe('# Updated');
    expect(state.activeId).toBe(first.id);
  });

  it('selects the adjacent tab when the active tab closes', () => {
    const first = tab('First.md');
    const second = tab('Second.md');
    const third = tab('Third.md');
    const state = {
      tabs: [first, second, third],
      activeId: second.id,
    };

    const closedMiddle = documentTabsReducer(state, {
      type: 'close',
      id: second.id,
    });
    expect(closedMiddle.activeId).toBe(third.id);

    const closedLast = documentTabsReducer(closedMiddle, {
      type: 'close',
      id: third.id,
    });
    expect(closedLast.activeId).toBe(first.id);
  });

  it('returns to an empty session after the final tab closes', () => {
    const only = tab('Only.md');
    const state = documentTabsReducer(
      { tabs: [only], activeId: only.id },
      { type: 'close', id: only.id }
    );

    expect(state).toEqual(initialDocumentTabsState);
  });

  it('tracks session drafts and does not overwrite a modified existing tab', () => {
    const original = tab('Draft.md');
    let state = documentTabsReducer(initialDocumentTabsState, {
      type: 'open',
      tab: original,
    });
    state = documentTabsReducer(state, {
      type: 'update',
      id: original.id,
      changes: {
        editorScrollTop: 240,
        editorSelection: { anchor: 8, head: 8 },
        markdown: '# Changed draft',
        previewScrollTop: 180,
        scrollTop: 180,
        splitRatio: 60,
        viewMode: 'split',
      },
    });

    expect(isDocumentDirty(state.tabs[0])).toBe(true);
    expect(state.tabs[0]).toMatchObject({
      editorScrollTop: 240,
      editorSelection: { anchor: 8, head: 8 },
      originalMarkdown: '# Draft.md',
      previewScrollTop: 180,
      scrollTop: 180,
      splitRatio: 60,
      viewMode: 'split',
    });

    state = documentTabsReducer(state, {
      type: 'open',
      tab: { ...original, markdown: '# Replacement source' },
    });
    expect(state.tabs[0].markdown).toBe('# Changed draft');
  });
});
