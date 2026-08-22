import { useEffect, useRef, useState } from 'react';

interface MathExpressionProps {
  display: boolean;
  source: string;
}

export default function MathExpression({
  display,
  source,
}: MathExpressionProps) {
  const container = useRef<HTMLSpanElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );

  useEffect(() => {
    let cancelled = false;
    const target = container.current;
    if (!target) return;
    target.replaceChildren();
    setStatus('loading');

    import('katex')
      .then(({ default: katex }) => {
        if (cancelled) return;
        katex.render(source, target, {
          displayMode: display,
          throwOnError: true,
          trust: false,
          output: 'htmlAndMathml',
        });
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        target.replaceChildren();
        setStatus('error');
      });

    return () => {
      cancelled = true;
      target.replaceChildren();
    };
  }, [display, source]);

  const content = (
    <>
      <span ref={container} className="math-canvas" />
      {status === 'loading' && (
        <span className="math-status" role="status">
          Rendering math…
        </span>
      )}
      {status === 'error' && (
        <code className="math-error" role="alert">
          {source}
        </code>
      )}
    </>
  );

  return display ? (
    <div className="math-expression math-expression-display">{content}</div>
  ) : (
    <span className="math-expression math-expression-inline">{content}</span>
  );
}
