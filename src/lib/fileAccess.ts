import { normalizePath } from './paths';

export interface FolderWorkspace {
  id: string;
  name: string;
  files: Map<string, File>;
  markdownPaths: string[];
}

let workspaceSequence = 0;

export interface DirectoryHandleLike {
  name: string;
  values(): AsyncIterableIterator<FileHandleLike | DirectoryHandleLike>;
  kind: 'directory';
}

export interface FileHandleLike {
  name: string;
  getFile(): Promise<File>;
  kind: 'file';
}

const markdownPattern = /\.(md|markdown)$/i;

function buildWorkspace(
  name: string,
  entries: Array<[string, File]>
): FolderWorkspace {
  workspaceSequence += 1;
  const files = new Map(entries);
  const markdownPaths = entries
    .map(([path]) => path)
    .filter((path) => markdownPattern.test(path))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return {
    id: `folder-workspace-${workspaceSequence}`,
    name,
    files,
    markdownPaths,
  };
}

export async function scanDirectory(
  root: DirectoryHandleLike
): Promise<FolderWorkspace> {
  const entries: Array<[string, File]> = [];
  let visited = 0;
  const visit = async (directory: DirectoryHandleLike, parent = '') => {
    for await (const handle of directory.values()) {
      const path = normalizePath(`${parent}/${handle.name}`);
      if (path === null) continue;
      if (handle.kind === 'directory') await visit(handle, path);
      else entries.push([path, await handle.getFile()]);
      visited += 1;
      if (visited % 50 === 0)
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  };
  await visit(root);
  return buildWorkspace(root.name, entries);
}

export function workspaceFromFileList(list: FileList): FolderWorkspace {
  const entries: Array<[string, File]> = [];
  let rootName = 'Selected folder';
  for (const file of Array.from(list)) {
    const relative = file.webkitRelativePath || file.name;
    const parts = relative.replace(/\\/g, '/').split('/');
    if (parts.length > 1) rootName = parts.shift() || rootName;
    const path = normalizePath(parts.join('/'));
    if (path !== null) entries.push([path, file]);
  }
  return buildWorkspace(rootName, entries);
}

export async function pickDirectory(): Promise<FolderWorkspace | null> {
  const picker = (
    window as typeof window & {
      showDirectoryPicker?: () => Promise<DirectoryHandleLike>;
    }
  ).showDirectoryPicker;
  if (!picker) return null;
  try {
    return await scanDirectory(await picker());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      return null;
    throw error;
  }
}

export function supportsDirectoryPicker() {
  return (
    typeof (window as typeof window & { showDirectoryPicker?: unknown })
      .showDirectoryPicker === 'function'
  );
}
