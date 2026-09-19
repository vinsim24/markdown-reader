import { normalizePath } from './paths';

export interface FolderWorkspace {
  id: string;
  name: string;
  files: Map<string, File>;
  handles: Map<string, FileHandleLike>;
  markdownPaths: string[];
}

export interface FileSystemPermissionOptions {
  mode: 'read' | 'readwrite';
}

let workspaceSequence = 0;

export interface DirectoryHandleLike {
  name: string;
  values(): AsyncIterableIterator<FileHandleLike | DirectoryHandleLike>;
  kind: 'directory';
  queryPermission?(options?: FileSystemPermissionOptions): Promise<PermissionState>;
  requestPermission?(options?: FileSystemPermissionOptions): Promise<PermissionState>;
}

export interface FileHandleLike {
  name: string;
  getFile(): Promise<File>;
  kind: 'file';
  createWritable?(): Promise<{
    close(): Promise<void>;
    write(data: string): Promise<void>;
  }>;
  queryPermission?(options?: FileSystemPermissionOptions): Promise<PermissionState>;
  requestPermission?(options?: FileSystemPermissionOptions): Promise<PermissionState>;
}

export interface FileVersion {
  lastModified: number;
  size: number;
}

const markdownPattern = /\.(md|markdown)$/i;

function buildWorkspace(
  name: string,
  entries: Array<[string, File]>,
  handles: Map<string, FileHandleLike> = new Map()
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
    handles,
    markdownPaths,
  };
}

export async function scanDirectory(
  root: DirectoryHandleLike
): Promise<FolderWorkspace> {
  const entries: Array<[string, File]> = [];
  const handles = new Map<string, FileHandleLike>();
  let visited = 0;
  const visit = async (directory: DirectoryHandleLike, parent = '') => {
    for await (const handle of directory.values()) {
      const path = normalizePath(`${parent}/${handle.name}`);
      if (path === null) continue;
      if (handle.kind === 'directory') await visit(handle, path);
      else {
        entries.push([path, await handle.getFile()]);
        handles.set(path, handle);
      }
      visited += 1;
      if (visited % 50 === 0)
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  };
  await visit(root);
  return buildWorkspace(root.name, entries, handles);
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

export async function pickFile(): Promise<{
  file: File;
  handle: FileHandleLike;
} | null> {
  const picker = (
    window as typeof window & {
      showOpenFilePicker?: (options?: unknown) => Promise<FileHandleLike[]>;
    }
  ).showOpenFilePicker;
  if (!picker) return null;
  try {
    const [handle] = await picker({
      excludeAcceptAllOption: true,
      multiple: false,
      types: [
        {
          description: 'Markdown',
          accept: { 'text/markdown': ['.md', '.markdown'] },
        },
      ],
    });
    return handle ? { file: await handle.getFile(), handle } : null;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  }
}

export function fileVersion(file: File): FileVersion {
  return { lastModified: file.lastModified, size: file.size };
}

export function sameFileVersion(left?: FileVersion, right?: FileVersion) {
  return (
    left !== undefined &&
    right !== undefined &&
    left.lastModified === right.lastModified &&
    left.size === right.size
  );
}

export function supportsFilePicker() {
  return (
    typeof (window as typeof window & { showOpenFilePicker?: unknown })
      .showOpenFilePicker === 'function'
  );
}

export function supportsDirectoryPicker() {
  return (
    typeof (window as typeof window & { showDirectoryPicker?: unknown })
      .showDirectoryPicker === 'function'
  );
}
