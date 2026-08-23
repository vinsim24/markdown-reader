import { CheckIcon as Check } from '@phosphor-icons/react/Check';
import { CopyIcon as Copy } from '@phosphor-icons/react/Copy';
import { CornersInIcon as CornersIn } from '@phosphor-icons/react/CornersIn';
import { CornersOutIcon as CornersOut } from '@phosphor-icons/react/CornersOut';
import { DownloadSimpleIcon as DownloadSimple } from '@phosphor-icons/react/DownloadSimple';
import { useEffect, useId, useRef, useState } from 'react';
import type { Theme } from '../lib/preferences';

let renderQueue = Promise.resolve();

const themeVariables: Record<Theme, Record<string, string>> = {
  light: {
    background: '#fcfcfd',
    primaryColor: '#e5ecf5',
    primaryTextColor: '#20262c',
    primaryBorderColor: '#3f6396',
    secondaryColor: '#eef1f3',
    tertiaryColor: '#f6f7f8',
    lineColor: '#5f6973',
  },
  dark: {
    background: '#1d2227',
    primaryColor: '#26374d',
    primaryTextColor: '#e8ecef',
    primaryBorderColor: '#87aadb',
    secondaryColor: '#252b31',
    tertiaryColor: '#161a1e',
    lineColor: '#a5adb5',
  },
  sepia: {
    background: '#fbf7ee',
    primaryColor: '#e9d9c7',
    primaryTextColor: '#433a32',
    primaryBorderColor: '#71513d',
    secondaryColor: '#eae0cf',
    tertiaryColor: '#f3ecdf',
    lineColor: '#675a4e',
  },
  mono: {
    background: '#fcfcfc',
    primaryColor: '#e1e4e6',
    primaryTextColor: '#202326',
    primaryBorderColor: '#30353a',
    secondaryColor: '#e9ebec',
    tertiaryColor: '#f4f5f5',
    lineColor: '#62676c',
  },
  cappuccino: {
    background: '#f5ede4',
    primaryColor: '#e4cdbd',
    primaryTextColor: '#3f322b',
    primaryBorderColor: '#6b4937',
    secondaryColor: '#e2d2c2',
    tertiaryColor: '#e9dfd3',
    lineColor: '#6d5b51',
  },
  contrast: {
    background: '#ffffff',
    primaryColor: '#ffffff',
    primaryTextColor: '#000000',
    primaryBorderColor: '#003cff',
    secondaryColor: '#eeeeee',
    tertiaryColor: '#ffffff',
    lineColor: '#000000',
  },
};

function renderDiagram(id: string, source: string, theme: Theme) {
  const render = renderQueue.then(async () => {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: 'base',
      themeVariables: themeVariables[theme],
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
  const figure = useRef<HTMLElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
    'idle'
  );
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const updateFullscreen = () =>
      setFullscreen(document.fullscreenElement === figure.current);
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreen);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

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

  const copySource = async () => {
    try {
      await navigator.clipboard.writeText(source);
      setCopyState('copied');
      copyTimer.current = setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('error');
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await figure.current?.requestFullscreen();
    } catch {
      return;
    }
  };

  const svgMarkup = () => {
    const svg = container.current?.querySelector('svg');
    if (!svg) return null;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return new XMLSerializer().serializeToString(clone);
  };

  const download = (blob: Blob, extension: 'png' | 'svg') => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mermaid-diagram.${extension}`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const downloadSvg = () => {
    const markup = svgMarkup();
    if (markup) download(new Blob([markup], { type: 'image/svg+xml' }), 'svg');
  };

  const downloadPng = async () => {
    const markup = svgMarkup();
    const svg = container.current?.querySelector('svg');
    if (!markup || !svg) return;
    const sourceUrl = URL.createObjectURL(
      new Blob([markup], { type: 'image/svg+xml' })
    );
    try {
      const image = new Image();
      image.src = sourceUrl;
      await image.decode();
      const viewBox = svg.viewBox.baseVal;
      const width = Math.max(1, viewBox.width || svg.clientWidth);
      const height = Math.max(1, viewBox.height || svg.clientHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * 2);
      canvas.height = Math.ceil(height * 2);
      const context = canvas.getContext('2d');
      if (!context) return;
      context.scale(2, 2);
      context.fillStyle = themeVariables[theme].background;
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const png = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (png) download(png, 'png');
    } catch {
      return;
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  };

  return (
    <figure
      ref={figure}
      className={`mermaid-diagram${fullscreen ? ' fullscreen' : ''}`}
      aria-busy={status === 'loading'}
    >
      <div
        className="mermaid-toolbar"
        role="toolbar"
        aria-label="Mermaid diagram actions"
      >
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={
            fullscreen ? 'Exit diagram full screen' : 'View diagram full screen'
          }
          title={fullscreen ? 'Exit full screen' : 'Full screen'}
        >
          {fullscreen ? (
            <CornersIn size={16} aria-hidden="true" />
          ) : (
            <CornersOut size={16} aria-hidden="true" />
          )}
        </button>
        <button type="button" onClick={copySource}>
          {copyState === 'copied' ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <Copy size={16} aria-hidden="true" />
          )}
          {copyState === 'copied'
            ? 'Copied'
            : copyState === 'error'
              ? 'Copy failed'
              : 'Copy'}
        </button>
        <button
          type="button"
          onClick={downloadPng}
          disabled={status !== 'ready'}
        >
          <DownloadSimple size={16} aria-hidden="true" />
          PNG
        </button>
        <button
          type="button"
          onClick={downloadSvg}
          disabled={status !== 'ready'}
        >
          <DownloadSimple size={16} aria-hidden="true" />
          SVG
        </button>
      </div>
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
