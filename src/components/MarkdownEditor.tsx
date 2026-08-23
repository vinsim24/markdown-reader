import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { basicSetup, EditorView } from 'codemirror';
import { useEffect, useRef } from 'react';
import type { EditorSelection } from '../lib/documentTabs';

interface MarkdownEditorProps {
  documentId: string;
  fileName: string;
  initialScrollTop: number;
  initialSelection: EditorSelection;
  markdown: string;
  onChange: (markdown: string, selection: EditorSelection) => void;
  onScroll: (scrollTop: number) => void;
}

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '14px',
    lineHeight: '1.7',
  },
  '.cm-content': {
    minHeight: '100%',
    padding: '28px 0 60px',
    caretColor: 'var(--accent)',
  },
  '.cm-line': { padding: '0 28px' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--accent-soft)',
  },
  '.cm-gutters': {
    borderRight: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'var(--muted)',
  },
  '.cm-activeLine, .cm-activeLineGutter': {
    backgroundColor: 'color-mix(in srgb, var(--accent-soft) 48%, transparent)',
  },
  '.cm-foldPlaceholder': {
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface-2)',
    color: 'var(--muted)',
  },
  '.cm-tooltip': {
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'var(--text)',
  },
  '.cm-panels': {
    borderColor: 'var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'var(--text)',
  },
  '.cm-panels input': {
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface-2)',
    color: 'var(--text)',
  },
});

const markdownHighlightStyle = HighlightStyle.define([
  {
    tag: [tags.heading, tags.strong],
    color: 'var(--text)',
    fontWeight: '700',
  },
  { tag: [tags.link, tags.url], color: 'var(--accent)', textDecoration: 'underline' },
  { tag: [tags.emphasis, tags.quote], color: 'var(--muted)', fontStyle: 'italic' },
  { tag: [tags.monospace, tags.string], color: 'var(--success)' },
  { tag: [tags.keyword, tags.atom, tags.bool], color: 'var(--accent-strong)' },
  { tag: [tags.number, tags.typeName], color: 'var(--danger)' },
  { tag: [tags.comment, tags.meta], color: 'var(--muted)' },
  { tag: tags.invalid, color: 'var(--danger)', textDecoration: 'underline wavy' },
]);

export default function MarkdownEditor({
  documentId,
  fileName,
  initialScrollTop,
  initialSelection,
  markdown: source,
  onChange,
  onScroll,
}: MarkdownEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const changeHandler = useRef(onChange);
  const scrollHandler = useRef(onScroll);

  changeHandler.current = onChange;
  scrollHandler.current = onScroll;

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;
    const maximumPosition = source.length;
    const anchor = Math.min(initialSelection.anchor, maximumPosition);
    const head = Math.min(initialSelection.head, maximumPosition);
    const view = new EditorView({
      parent,
      doc: source,
      selection: { anchor, head },
      extensions: [
        basicSetup,
        markdown(),
        syntaxHighlighting(markdownHighlightStyle),
        EditorView.lineWrapping,
        editorTheme,
        EditorView.contentAttributes.of({
          'aria-label': `Markdown editor for ${fileName}`,
          'aria-multiline': 'true',
        }),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged && !update.selectionSet) return;
          const selection = update.state.selection.main;
          changeHandler.current(update.state.doc.toString(), {
            anchor: selection.anchor,
            head: selection.head,
          });
        }),
      ],
    });
    const rememberScroll = () =>
      scrollHandler.current(view.scrollDOM.scrollTop);
    view.scrollDOM.addEventListener('scroll', rememberScroll, {
      passive: true,
    });
    const focusFrame = requestAnimationFrame(() => {
      view.scrollDOM.scrollTop = initialScrollTop;
      view.focus();
    });
    return () => {
      cancelAnimationFrame(focusFrame);
      view.scrollDOM.removeEventListener('scroll', rememberScroll);
      view.destroy();
    };
  }, [documentId, fileName]);

  return <div className="markdown-editor" ref={host} />;
}
