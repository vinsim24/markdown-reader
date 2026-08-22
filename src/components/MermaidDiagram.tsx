import { useEffect, useId, useRef, useState } from 'react';
import type { Theme } from '../lib/preferences';

let renderQueue = Promise.resolve();

function renderDiagram(id: string, source: string, theme: Theme) {
  const render = renderQueue.then(async () => {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: theme === 'dark' ? 'dark' : 'neutral',
      flowchart: { htmlLabels: false },
    });
    return mermaid.render(id, source);
  });
  renderQueue = render.then(
    () => undefined,
    () => undefined
  );
  return render;
}

interface MermaidDiagramProps {
  source: string;
  theme: Theme;
}

export default function MermaidDiagram({ source, theme }: MermaidDiagramProps) {
  const reactId = useId();
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );

  useEffect(() => {
    let cancelled = false;
    const target = container.current;
    if (!target) return;
    target.replaceChildren();
    setStatus('loading');

    const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    renderDiagram(id, source, theme)
      .then(({ svg }) => {
        if (cancelled) return;
        const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
        if (parsed.querySelector('parsererror')) {
          throw new Error('Mermaid returned invalid SVG.');
        }
        const svgElement = parsed.documentElement;
        if (svgElement.localName !== 'svg') {
          throw new Error('Mermaid did not return an SVG element.');
        }
        svgElement.setAttribute('role', 'img');
        if (
          !svgElement.hasAttribute('aria-label') &&
          !svgElement.hasAttribute('aria-labelledby')
        ) {
          svgElement.setAttribute('aria-label', 'Mermaid diagram');
        }
        target.replaceChildren(document.importNode(svgElement, true));
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
  }, [reactId, source, theme]);

  return (
    <figure className="mermaid-diagram" aria-busy={status === 'loading'}>
      <div ref={container} className="mermaid-canvas" />
      {status === 'loading' && <p role="status">Rendering diagram…</p>}
      {status === 'error' && (
        <figcaption className="mermaid-error" role="alert">
          <strong>This Mermaid diagram could not be rendered.</strong>
          <pre>
            <code>{source}</code>
          </pre>
        </figcaption>
      )}
    </figure>
  );
}
