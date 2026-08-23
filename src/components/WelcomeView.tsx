import { ArrowRightIcon as ArrowRight } from '@phosphor-icons/react/ArrowRight';
import { BookOpenTextIcon as BookOpenText } from '@phosphor-icons/react/BookOpenText';
import { FileArrowUpIcon as FileArrowUp } from '@phosphor-icons/react/FileArrowUp';
import { FolderOpenIcon as FolderOpen } from '@phosphor-icons/react/FolderOpen';
import { GlobeHemisphereWestIcon as GlobeHemisphereWest } from '@phosphor-icons/react/GlobeHemisphereWest';
import { TreeStructureIcon as TreeStructure } from '@phosphor-icons/react/TreeStructure';
import type { MouseEvent } from 'react';
import BrandMark from './BrandMark';

interface WelcomeViewProps {
  folderLoading: boolean;
  onOpenCheatSheet: () => void;
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onOpenObsidianGuide: () => void;
  onOpenMarkmapExamples: () => void;
  onOpenUrlImport: (event: MouseEvent<HTMLButtonElement>) => void;
}

export default function WelcomeView({
  folderLoading,
  onOpenCheatSheet,
  onOpenFile,
  onOpenFolder,
  onOpenObsidianGuide,
  onOpenMarkmapExamples,
  onOpenUrlImport,
}: WelcomeViewProps) {
  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <div className="welcome-intro">
        <BrandMark className="welcome-mark" />
        <p className="eyebrow">Private by design</p>
        <h1 id="welcome-title">Markdown, made comfortable.</h1>
        <p className="welcome-copy">
          Read local documents with thoughtful typography and no uploads.
        </p>
        <div className="welcome-actions">
          <button
            type="button"
            className="welcome-primary"
            onClick={onOpenFile}
          >
            <FileArrowUp size={18} weight="bold" aria-hidden="true" />
            Import Markdown
          </button>
          <button
            type="button"
            className="welcome-secondary"
            onClick={onOpenFolder}
            disabled={folderLoading}
          >
            <FolderOpen size={18} aria-hidden="true" />
            {folderLoading ? 'Scanning...' : 'Open folder'}
          </button>
        </div>
        <button
          type="button"
          className="welcome-link-action"
          onClick={onOpenUrlImport}
        >
          <GlobeHemisphereWest size={16} aria-hidden="true" />
          Import from URL
        </button>
        <p className="welcome-drop">Or drop a .md or .markdown file anywhere</p>
      </div>
      <aside
        className="welcome-examples"
        aria-labelledby="welcome-examples-title"
      >
        <p className="welcome-examples-title" id="welcome-examples-title">
          Start with an example
        </p>
        <p className="welcome-examples-copy">
          Explore supported formats without choosing a local file.
        </p>
        <button
          type="button"
          className="welcome-example-action"
          onClick={onOpenCheatSheet}
          aria-label="Open cheat sheet"
        >
          <BookOpenText size={20} aria-hidden="true" />
          <span className="welcome-example-copy">
            <strong>Open cheat sheet</strong>
            <span>Markdown, math, code, and Mermaid diagrams</span>
          </span>
          <ArrowRight size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="welcome-example-action"
          onClick={onOpenObsidianGuide}
          aria-label="Obsidian guide"
        >
          <BookOpenText size={20} aria-hidden="true" />
          <span className="welcome-example-copy">
            <strong>Obsidian guide</strong>
            <span>Callouts, wikilinks, embeds, and properties</span>
          </span>
          <ArrowRight size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="welcome-example-action"
          onClick={onOpenMarkmapExamples}
          aria-label="Markmap example"
        >
          <TreeStructure size={20} aria-hidden="true" />
          <span className="welcome-example-copy">
            <strong>Markmap example</strong>
            <span>Interactive mind maps generated from Markdown</span>
          </span>
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </aside>
    </section>
  );
}
