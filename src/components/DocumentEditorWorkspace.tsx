import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  lazy,
  Suspense,
  useEffect,
  useRef,
} from 'react';
import {
  type DocumentTab,
  isDocumentDirty,
} from '../lib/documentTabs';
import type { Theme } from '../lib/preferences';
import MarkdownDocument from './MarkdownDocument';

const MarkdownEditor = lazy(() => import('./MarkdownEditor'));

interface DocumentEditorWorkspaceProps {
  activeDocument: DocumentTab;
  mode: 'editor' | 'split';
  onEditorChange: DocumentEditorChange;
  onEditorScroll: (id: string, scrollTop: number) => void;
  onPreviewScroll: (id: string, scrollTop: number) => void;
  onRelativeLink: (href: string) => Promise<void>;
  onSplitRatioChange: (id: string, splitRatio: number) => void;
  theme: Theme;
}

type DocumentEditorChange = (
  id: string,
  markdown: string,
  selection: DocumentTab['editorSelection']
) => void;

export default function DocumentEditorWorkspace({
  activeDocument,
  mode,
  onEditorChange,
  onEditorScroll,
  onPreviewScroll,
  onRelativeLink,
  onSplitRatioChange,
  theme,
}: DocumentEditorWorkspaceProps) {
  const preview = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== 'split' || !preview.current) return;
    preview.current.scrollTop = activeDocument.previewScrollTop;
  }, [activeDocument.id, mode]);

  const setSplitRatio = (ratio: number) =>
    onSplitRatioChange(
      activeDocument.id,
      Math.min(75, Math.max(25, Math.round(ratio)))
    );

  const beginResize = (event: ReactPointerEvent, stacked: boolean) => {
    event.preventDefault();
    const workspace = event.currentTarget.parentElement;
    if (!workspace) return;
    const resize = (pointer: PointerEvent) => {
      const bounds = workspace.getBoundingClientRect();
      const position = stacked
        ? (pointer.clientY - bounds.top) / bounds.height
        : (pointer.clientX - bounds.left) / bounds.width;
      setSplitRatio(position * 100);
    };
    const stop = () => {
      window.removeEventListener('pointermove', resize);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      document.body.classList.remove('resizing-split');
    };
    document.body.classList.add('resizing-split');
    window.addEventListener('pointermove', resize);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
  };

  const resizeWithKeyboard = (
    event: KeyboardEvent<HTMLDivElement>,
    stacked: boolean
  ) => {
    const decrement = stacked ? 'ArrowUp' : 'ArrowLeft';
    const increment = stacked ? 'ArrowDown' : 'ArrowRight';
    if (![decrement, increment, 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') setSplitRatio(25);
    else if (event.key === 'End') setSplitRatio(75);
    else setSplitRatio(activeDocument.splitRatio + (event.key === increment ? 5 : -5));
  };

  const editor = (
    <Suspense
      fallback={
        <div className="editor-loading" role="status">
          Preparing editor...
        </div>
      }
    >
      <MarkdownEditor
        documentId={activeDocument.id}
        fileName={activeDocument.title}
        initialScrollTop={activeDocument.editorScrollTop}
        initialSelection={activeDocument.editorSelection}
        markdown={activeDocument.markdown}
        onChange={(markdown, selection) =>
          onEditorChange(activeDocument.id, markdown, selection)
        }
        onScroll={(scrollTop) =>
          onEditorScroll(activeDocument.id, scrollTop)
        }
      />
    </Suspense>
  );

  return (
    <section
      className={`editor-workspace ${mode === 'split' ? 'split-workspace' : 'write-workspace'}`}
      style={
        mode === 'split'
          ? ({ '--split-ratio': `${activeDocument.splitRatio}%` } as CSSProperties)
          : undefined
      }
      aria-label={
        mode === 'split'
          ? `Split view for ${activeDocument.title}`
          : `Writing ${activeDocument.title}`
      }
    >
      <div className="editor-status" role="status">
        {isDocumentDirty(activeDocument) ? 'Unsaved changes' : 'Session draft'}
      </div>
      {mode === 'split' ? (
        <>
          <div className="split-pane split-editor-pane" aria-label="Markdown source">
            {editor}
          </div>
          <div
            aria-label="Resize split panes"
            aria-orientation="vertical"
            aria-valuemax={75}
            aria-valuemin={25}
            aria-valuenow={activeDocument.splitRatio}
            className="split-divider split-divider-desktop"
            onKeyDown={(event) => resizeWithKeyboard(event, false)}
            onPointerDown={(event) => beginResize(event, false)}
            role="separator"
            tabIndex={0}
          />
          <div
            aria-label="Resize split panes"
            aria-orientation="horizontal"
            aria-valuemax={75}
            aria-valuemin={25}
            aria-valuenow={activeDocument.splitRatio}
            className="split-divider split-divider-tablet"
            onKeyDown={(event) => resizeWithKeyboard(event, true)}
            onPointerDown={(event) => beginResize(event, true)}
            role="separator"
            tabIndex={0}
          />
          <div
            className="split-pane split-preview-pane"
            aria-label="Live preview"
            onScroll={(event) =>
              onPreviewScroll(activeDocument.id, event.currentTarget.scrollTop)
            }
            ref={preview}
            tabIndex={0}
          >
            <MarkdownDocument
              activePath={activeDocument.activePath}
              files={activeDocument.folder?.files}
              markdown={activeDocument.markdown}
              onRelativeLink={onRelativeLink}
              search=""
              theme={theme}
            />
          </div>
        </>
      ) : (
        editor
      )}
    </section>
  );
}
