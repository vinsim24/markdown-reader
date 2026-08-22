export interface ResolvedMarkdownTarget {
  path: string;
  query: string;
  anchor: string;
}

export function decodePath(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizePath(value: string): string | null {
  const segments = decodePath(value).replace(/\\/g, '/').split('/');
  const normalized: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (normalized.length === 0) return null;
      normalized.pop();
    } else {
      normalized.push(segment);
    }
  }
  return normalized.join('/');
}

export function dirname(path: string) {
  const index = path.lastIndexOf('/');
  return index === -1 ? '' : path.slice(0, index);
}

export function isExternalUrl(value: string) {
  return /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//');
}

export function resolveAssetPath(reference: string, currentPath: string) {
  const path = reference.split(/[?#]/, 1)[0];
  if (!path || isExternalUrl(path)) return null;
  return normalizePath(`${dirname(currentPath)}/${path}`);
}

export function resolveMarkdownTarget(
  href: string,
  currentPath: string,
  markdownPaths: ReadonlySet<string>
): ResolvedMarkdownTarget | null {
  if (isExternalUrl(href)) return null;
  const hashIndex = href.indexOf('#');
  const anchor = hashIndex === -1 ? '' : href.slice(hashIndex + 1);
  const beforeHash = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const queryIndex = beforeHash.indexOf('?');
  const query = queryIndex === -1 ? '' : beforeHash.slice(queryIndex + 1);
  const rawPath =
    queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);

  if (!rawPath) return { path: currentPath, query, anchor };
  const path = normalizePath(`${dirname(currentPath)}/${rawPath}`);
  if (path === null) return null;

  const candidates = [path];
  if (!/\.[^/]+$/.test(path)) candidates.push(`${path}.md`, `${path}.markdown`);
  candidates.push(`${path}/README.md`, `${path}/index.md`);
  const resolved = candidates.find((candidate) => markdownPaths.has(candidate));
  return resolved ? { path: resolved, query, anchor } : null;
}
