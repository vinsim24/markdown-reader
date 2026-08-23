import {
  isValidElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

const languageLabels: Record<string, string> = {
  bash: 'Bash',
  css: 'CSS',
  html: 'HTML',
  javascript: 'JavaScript',
  js: 'JavaScript',
  json: 'JSON',
  markdown: 'Markdown',
  md: 'Markdown',
  python: 'Python',
  py: 'Python',
  shell: 'Shell',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  yaml: 'YAML',
  yml: 'YAML',
};

function textContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textContent(node.props.children);
  }
  return '';
}

interface CodeBlockProps {
  children: ReactNode;
  className?: string;
}

export default function CodeBlock({ children, className }: CodeBlockProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
    'idle'
  );
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const languageKey =
    className?.match(/(?:^|\s)language-([\w-]+)/)?.[1].toLowerCase() || 'text';
  const language =
    languageLabels[languageKey] ||
    languageKey.charAt(0).toUpperCase() + languageKey.slice(1);
  const source = textContent(children).replace(/\n$/, '');

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    []
  );

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(source);
      setCopyState('copied');
      resetTimer.current = setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('error');
    }
  };

  const copyLabel =
    copyState === 'copied'
      ? 'Copied'
      : copyState === 'error'
        ? 'Copy failed'
        : 'Copy';

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-window-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="code-language">{language}</span>
        <button
          type="button"
          className="code-copy"
          onClick={copy}
          aria-label={`${copyLabel} ${language} code`}
        >
          <span aria-hidden="true">⧉</span>
          {copyLabel}
        </button>
      </div>
      <pre>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}
