import { BookOpenTextIcon as BookOpenText } from '@phosphor-icons/react/BookOpenText';
import { CaretDownIcon as CaretDown } from '@phosphor-icons/react/CaretDown';
import { GlobeHemisphereWestIcon as GlobeHemisphereWest } from '@phosphor-icons/react/GlobeHemisphereWest';
import { TreeStructureIcon as TreeStructure } from '@phosphor-icons/react/TreeStructure';
import { type MouseEvent, useEffect, useRef, useState } from 'react';

interface SourceMenuProps {
  onOpenCheatSheet: () => void;
  onOpenMarkmapExamples: () => void;
  onOpenObsidianGuide: () => void;
  onOpenUrlImport: (event: MouseEvent<HTMLButtonElement>) => void;
}

export default function SourceMenu({
  onOpenCheatSheet,
  onOpenMarkmapExamples,
  onOpenObsidianGuide,
  onOpenUrlImport,
}: SourceMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    firstItemRef.current?.focus();
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const runAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div className="source-menu" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="toolbar-button source-menu-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="source-menu"
        onClick={() => setOpen((current) => !current)}
      >
        More <CaretDown size={13} aria-hidden="true" />
      </button>
      {open && (
        <div id="source-menu" className="source-menu-panel" role="menu">
          <p className="source-menu-label" role="presentation">
            Open another source
          </p>
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            onClick={(event) => {
              onOpenUrlImport(event);
              setOpen(false);
            }}
          >
            <GlobeHemisphereWest size={18} aria-hidden="true" />
            <span>
              <strong>Import URL</strong>
              <span>Open public Markdown or a GitHub README</span>
            </span>
          </button>
          <hr className="source-menu-divider" />
          <p className="source-menu-label" role="presentation">
            Bundled examples
          </p>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onOpenCheatSheet)}
          >
            <BookOpenText size={18} aria-hidden="true" />
            <span>
              <strong>Cheat sheet</strong>
              <span>Markdown, math, code, and diagrams</span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onOpenObsidianGuide)}
          >
            <BookOpenText size={18} aria-hidden="true" />
            <span>
              <strong>Obsidian guide</strong>
              <span>Callouts, wikilinks, embeds, and properties</span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onOpenMarkmapExamples)}
          >
            <TreeStructure size={18} aria-hidden="true" />
            <span>
              <strong>Markmap example</strong>
              <span>Explore Markdown as an interactive mind map</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
