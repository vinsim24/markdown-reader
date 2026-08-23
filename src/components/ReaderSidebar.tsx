import type { FolderWorkspace } from '../lib/fileAccess';
import type { DocumentHeading } from '../lib/headings';
import FileTree from './FileTree';

interface ReaderSidebarProps {
  activeHeading: string;
  activePath: string;
  fileName: string;
  folder?: FolderWorkspace;
  headings: DocumentHeading[];
  navOpen: boolean;
  onClose: () => void;
  onHeadingSelect: (id: string) => void;
  onOpenFile: (path: string, anchor?: string, query?: string) => Promise<void>;
  readingMinutes: number;
  words: number;
}

export default function ReaderSidebar({
  activeHeading,
  activePath,
  fileName,
  folder,
  headings,
  navOpen,
  onClose,
  onHeadingSelect,
  onOpenFile,
  readingMinutes,
  words,
}: ReaderSidebarProps) {
  return (
    <aside
      id="reader-sidebar"
      className={`sidebar ${navOpen ? 'open' : ''}`}
      aria-label="Document navigation"
    >
      <div className="sidebar-heading">
        <span>Navigation</span>
        <button
          type="button"
          className="close-nav mobile-only"
          onClick={onClose}
          aria-label="Close navigation"
        >
          ×
        </button>
      </div>
      <div className="file-card">
        <div className="file-icon">MD</div>
        <div>
          <strong>{fileName}</strong>
          <small>Local document · {readingMinutes} min read</small>
        </div>
      </div>
      {folder && (
        <div className="folder-section">
          <div className="toc-label">{folder.name}</div>
          {folder.markdownPaths.length > 0 ? (
            <FileTree
              paths={folder.markdownPaths}
              activePath={activePath}
              onOpen={onOpenFile}
            />
          ) : (
            <p className="tree-empty">No Markdown files found</p>
          )}
        </div>
      )}
      <div className="toc-label">On this page</div>
      <nav className="toc">
        {headings.map((heading) => (
          <a
            key={heading.id}
            className={`level-${heading.level}${activeHeading === heading.id ? ' active' : ''}`}
            href={`#${heading.id}`}
            onClick={() => onHeadingSelect(heading.id)}
            aria-current={activeHeading === heading.id ? 'location' : undefined}
          >
            {heading.text}
          </a>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="status-dot" />
        Local only <span className="footer-separator">·</span>
        {words.toLocaleString()} words
      </div>
    </aside>
  );
}
