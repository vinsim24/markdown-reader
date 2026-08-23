import type { MouseEvent } from 'react';

interface WelcomeViewProps {
  folderLoading: boolean;
  onOpenCheatSheet: () => void;
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onOpenUrlImport: (event: MouseEvent<HTMLButtonElement>) => void;
}

export default function WelcomeView({
  folderLoading,
  onOpenCheatSheet,
  onOpenFile,
  onOpenFolder,
  onOpenUrlImport,
}: WelcomeViewProps) {
  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <span className="welcome-mark" aria-hidden="true">
        MD
      </span>
      <p className="eyebrow">Your private reading space</p>
      <h1 id="welcome-title">Open a Markdown document</h1>
      <p className="welcome-copy">
        Choose a file or folder to begin. Your documents stay on this device and
        are never uploaded.
      </p>
      <div className="welcome-actions">
        <button type="button" className="welcome-primary" onClick={onOpenFile}>
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
        <button
          type="button"
          className="welcome-secondary"
          onClick={onOpenCheatSheet}
        >
          Open cheat sheet
        </button>
        <button
          type="button"
          className="welcome-secondary"
          onClick={onOpenUrlImport}
        >
          Import from URL
        </button>
      </div>
      <p className="welcome-drop">or drop a .md or .markdown file</p>
    </section>
  );
}
