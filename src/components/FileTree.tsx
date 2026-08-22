import { useState } from 'react';

interface TreeFolder {
  name: string;
  path: string;
  folders: Map<string, TreeFolder>;
  files: string[];
}

function makeTree(paths: string[]) {
  const root: TreeFolder = { name: '', path: '', folders: new Map(), files: [] };
  for (const path of paths) {
    const parts = path.split('/');
    const file = parts.pop();
    let folder = root;
    for (const part of parts) {
      const folderPath = folder.path ? `${folder.path}/${part}` : part;
      if (!folder.folders.has(part)) {
        folder.folders.set(part, { name: part, path: folderPath, folders: new Map(), files: [] });
      }
      folder = folder.folders.get(part)!;
    }
    if (file) folder.files.push(path);
  }
  return root;
}

interface FileTreeProps {
  paths: string[];
  activePath: string;
  onOpen: (path: string) => void;
}

export default function FileTree({ paths, activePath, onOpen }: FileTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const root = makeTree(paths);
  const toggle = (path: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };
  const renderFolder = (folder: TreeFolder, depth: number) => {
    const folders = [...folder.folders.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
    const files = [...folder.files].sort((a, b) =>
      a.split('/').at(-1)!.localeCompare(b.split('/').at(-1)!, undefined, { sensitivity: 'base' }),
    );
    return (
      <div key={folder.path || 'root'}>
        {folder.path && (
          <button
            type="button"
            className="tree-folder"
            style={{ paddingLeft: `${8 + depth * 14}px` }}
            onClick={() => toggle(folder.path)}
            aria-expanded={!collapsed.has(folder.path)}
          >
            <span>{collapsed.has(folder.path) ? '▸' : '▾'}</span> {folder.name}
          </button>
        )}
        {!collapsed.has(folder.path) && (
          <div>
            {folders.map((child) => renderFolder(child, depth + 1))}
            {files.map((path) => (
              <button
                type="button"
                key={path}
                className={`tree-file${activePath === path ? ' active' : ''}`}
                style={{ paddingLeft: `${22 + depth * 14}px` }}
                onClick={() => onOpen(path)}
                aria-current={activePath === path ? 'page' : undefined}
                title={path}
              >
                {path.split('/').at(-1)}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };
  return <div className="file-tree">{renderFolder(root, -1)}</div>;
}

