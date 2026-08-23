import { useEffect, useRef, useState } from 'react';
import {
  sanitizeMarkmapTree,
  serializeMarkmapSvg,
  type SafeMarkmapNode,
} from '../lib/markmap';

interface MarkmapInstance {
  destroy: () => void;
  fit: () => Promise<void>;
  rescale: (scale: number) => Promise<void>;
}

interface MarkmapViewProps {
  fileName: string;
  markdown: string;
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function exportBaseName(fileName: string) {
  return fileName.replace(/\.(?:md|markdown)$/i, '') || 'mind-map';
}

export default function MarkmapView({ fileName, markdown }: MarkmapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const instanceRef = useRef<MarkmapInstance | null>(null);
  const stylesheetRef = useRef('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    void Promise.all([import('markmap-lib/no-plugins'), import('markmap-view')])
      .then(async ([{ Transformer }, { Markmap, globalCSS }]) => {
        if (cancelled || !svgRef.current) return;
        // Use Markmap's no-plugin entry so mind maps never preload CDN assets.
        // Node labels are text-only and the normal Reader handles rich syntax.
        const transformer = new Transformer();
        const transformed = transformer.transform(markdown);
        const root = sanitizeMarkmapTree(
          transformed.root as unknown as SafeMarkmapNode
        );
        stylesheetRef.current = globalCSS;
        const instance = Markmap.create(
          svgRef.current,
          {
            autoFit: false,
            duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 0
              : 300,
            embedGlobalCSS: true,
            pan: true,
            zoom: true,
          }
        );
        instanceRef.current = instance;
        await instance.setData(root as Parameters<typeof instance.setData>[0]);
        if (cancelled) return;
        await instance.fit();
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError('The mind map could not be created for this document.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [markdown]);

  useEffect(() => {
    const onFullscreenChange = () =>
      setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const exportSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const { width, height } = svg.getBoundingClientRect();
    const source = serializeMarkmapSvg(
      svg,
      stylesheetRef.current,
      Math.max(width, 1),
      Math.max(height, 1)
    );
    download(
      new Blob([source], { type: 'image/svg+xml;charset=utf-8' }),
      `${exportBaseName(fileName)}.svg`
    );
  };

  const exportPng = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    const { width, height } = svg.getBoundingClientRect();
    const exportWidth = Math.max(Math.round(width), 1);
    const exportHeight = Math.max(Math.round(height), 1);
    const source = serializeMarkmapSvg(
      svg,
      stylesheetRef.current,
      exportWidth,
      exportHeight
    );
    const imageUrl = URL.createObjectURL(
      new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    );
    const image = new Image();
    image.decoding = 'async';
    image.src = imageUrl;
    try {
      await image.decode();
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = exportWidth * scale;
      canvas.height = exportHeight * scale;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable');
      context.scale(scale, scale);
      context.fillStyle = getComputedStyle(containerRef.current ?? svg)
        .backgroundColor;
      context.fillRect(0, 0, exportWidth, exportHeight);
      context.drawImage(image, 0, 0, exportWidth, exportHeight);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (blob) download(blob, `${exportBaseName(fileName)}.png`);
    } catch {
      setError('The PNG export could not be created. SVG export is still available.');
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await containerRef.current?.requestFullscreen();
    requestAnimationFrame(() => {
      void instanceRef.current?.fit().catch(() => undefined);
    });
  };

  const runViewAction = (action: () => Promise<void> | undefined) => {
    void action()?.catch(() => undefined);
  };

  return (
    <section
      className="markmap-view"
      ref={containerRef}
      aria-label={`Mind map for ${fileName}`}
    >
      <div className="markmap-toolbar" aria-label="Mind map controls">
        <span className="markmap-help">Drag to pan · scroll to zoom · select a branch to fold</span>
        <div className="markmap-actions">
          <button type="button" onClick={() => runViewAction(() => instanceRef.current?.fit())}>
            Fit
          </button>
          <button type="button" aria-label="Zoom in" onClick={() => runViewAction(() => instanceRef.current?.rescale(1.2))}>
            +
          </button>
          <button type="button" aria-label="Zoom out" onClick={() => runViewAction(() => instanceRef.current?.rescale(0.8))}>
            −
          </button>
          <button type="button" onClick={() => void toggleFullscreen()}>
            {fullscreen ? 'Exit full screen' : 'Full screen'}
          </button>
          <button type="button" onClick={exportSvg}>SVG</button>
          <button type="button" onClick={() => void exportPng()}>PNG</button>
        </div>
      </div>
      {loading && <p className="markmap-status" role="status">Building mind map…</p>}
      {error && <p className="markmap-status error" role="alert">{error}</p>}
      <svg ref={svgRef} aria-label="Interactive Markdown mind map" role="img" />
    </section>
  );
}
