import type { MouseEvent } from 'react';

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
        <span className="welcome-mark" aria-hidden="true">
          MD
        </span>
        <p className="eyebrow">Your private reading space</p>
        <h1 id="welcome-title">Open a Markdown document</h1>
        <p className="welcome-copy">
          Choose a file or folder to begin. Your documents stay on this device
          and are never uploaded.
        </p>
        <div className="welcome-actions">
          <button
            type="button"
            className="welcome-primary"
            onClick={onOpenFile}
          >
            Import Markdown
          </button>
          <button
            type="button"
            className="welcome-secondary"
            onClick={onOpenFolder}
            disabled={folderLoading}
          >
            {folderLoading ? 'Scanning…' : 'Open folder'}
          </button>
        </div>
        <button
          type="button"
          className="welcome-link-action"
          onClick={onOpenUrlImport}
        >
          Import from URL
        </button>
        <p className="welcome-drop">
          You can also drop a .md or .markdown file
        </p>
      </div>
      <aside
        className="welcome-examples"
        aria-labelledby="welcome-examples-title"
      >
        <p className="welcome-examples-title" id="welcome-examples-title">
          Explore with an example
        </p>
        <p className="welcome-examples-copy">
          See supported syntax without choosing a local file.
        </p>
        <button
          type="button"
          className="welcome-example-action"
          onClick={onOpenCheatSheet}
          aria-label="Open cheat sheet"
        >
          <strong>Open cheat sheet</strong>
          <span>Markdown, math, code, and Mermaid diagrams</span>
        </button>
        <button
          type="button"
          className="welcome-example-action"
          onClick={onOpenObsidianGuide}
          aria-label="Obsidian guide"
        >
          <strong>Obsidian guide</strong>
          <span>Callouts, wikilinks, embeds, and properties</span>
        </button>
        <button
          type="button"
          className="welcome-example-action"
          onClick={onOpenMarkmapExamples}
          aria-label="Markmap example"
        >
          <strong>Markmap example</strong>
          <span>Interactive mind maps generated from Markdown</span>
        </button>
      </aside>
    </section>
  );
}
