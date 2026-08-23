import GithubSlugger from 'github-slugger';
import type {
  Blockquote,
  Image,
  Link,
  Parent,
  PhrasingContent,
  Root,
  RootContent,
  Text,
} from 'mdast';
import { resolveMarkdownTarget } from './paths';

export interface ObsidianProperty {
  key: string;
  value: string;
}

export interface ObsidianDocument {
  markdown: string;
  properties: ObsidianProperty[];
}

export function parseObsidianDocument(markdown: string): ObsidianDocument {
  const normalized = markdown.replace(/^\uFEFF/, '');
  if (!normalized.startsWith('---\n') && !normalized.startsWith('---\r\n')) {
    return { markdown: normalized, properties: [] };
  }
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { markdown: normalized, properties: [] };
  const properties = match[1]
    .split(/\r?\n/)
    .map((line) => {
      const separator = line.indexOf(':');
      if (separator < 1) return null;
      return {
        key: line.slice(0, separator).trim(),
        value: line.slice(separator + 1).trim(),
      };
    })
    .filter((property): property is ObsidianProperty => property !== null);
  return { markdown: normalized.slice(match[0].length), properties };
}

function noteHref(target: string) {
  const [notePart, heading = ''] = target.split('#', 2);
  if (!notePart && heading) return `#${new GithubSlugger().slug(heading)}`;
  const note = /\.(md|markdown)$/i.test(notePart) ? notePart : `${notePart}.md`;
  const hash = heading ? `#${new GithubSlugger().slug(heading)}` : '';
  return `${note}?obsidian-wikilink${hash}`;
}

function tokenNodes(value: string): PhrasingContent[] {
  const pattern =
    /(!?\[\[[^\]]+\]\]|==[^=\n]+==|(?:^|(?<=\s))#[A-Za-z][\w/-]*)/g;
  const nodes: PhrasingContent[] = [];
  let offset = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index;
    if (index > offset)
      nodes.push({ type: 'text', value: value.slice(offset, index) });
    const token = match[0];
    if (token.startsWith('![[')) {
      const contents = token.slice(3, -2);
      const [target, size = ''] = contents.split('|', 2);
      const isImage = /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(target);
      nodes.push({
        type: 'image',
        url: isImage ? target : noteHref(target),
        alt: target,
        title: isImage
          ? `obsidian-image-embed:${/^\d+$/.test(size) ? size : ''}`
          : 'obsidian-note-embed',
      } as Image);
    } else if (token.startsWith('[[')) {
      const contents = token.slice(2, -2);
      const [target, alias] = contents.split('|', 2);
      nodes.push({
        type: 'link',
        url: noteHref(target),
        children: [
          { type: 'text', value: alias || target.replace('#', ' › ') },
        ],
      } as Link);
    } else if (token.startsWith('==')) {
      nodes.push({
        type: 'text',
        value: token.slice(2, -2),
        data: { hName: 'mark' },
      } as Text);
    } else {
      const leadingSpace = token.startsWith(' ') ? ' ' : '';
      if (leadingSpace) nodes.push({ type: 'text', value: leadingSpace });
      nodes.push({
        type: 'text',
        value: token.trim(),
        data: {
          hName: 'span',
          hProperties: { className: ['obsidian-tag'] },
        },
      } as Text);
    }
    offset = index + token.length;
  }
  if (offset < value.length)
    nodes.push({ type: 'text', value: value.slice(offset) });
  return nodes.length ? nodes : [{ type: 'text', value }];
}

function markCallout(node: Blockquote) {
  const paragraph = node.children[0];
  if (paragraph?.type !== 'paragraph') return;
  const first = paragraph.children[0];
  if (first?.type !== 'text') return;
  const match = first.value.match(/^\[!([\w-]+)\]([+-])?(?:\s+([^\n]*))?/i);
  if (!match) return;
  const type = match[1].toLowerCase();
  const title = match[3] || type.charAt(0).toUpperCase() + type.slice(1);
  first.value = `${title}${first.value.slice(match[0].length)}`;
  node.data = {
    hName: 'blockquote',
    hProperties: {
      className: [
        'obsidian-callout',
        `obsidian-callout-${type}`,
        ...(match[2] ? ['obsidian-callout-foldable'] : []),
      ],
      'data-callout': type,
    },
  };
}

function transform(parent: Parent) {
  const children: RootContent[] = [];
  for (const child of parent.children as RootContent[]) {
    if (child.type === 'blockquote') markCallout(child);
    if ('children' in child && !['code', 'inlineCode'].includes(child.type)) {
      transform(child as Parent);
    }
    if (child.type === 'text') children.push(...tokenNodes(child.value));
    else children.push(child);
  }
  parent.children = children;
}

export function remarkObsidian() {
  return (tree: Root) => transform(tree);
}

export function resolveObsidianWikilink(
  href: string,
  currentPath: string,
  markdownPaths: string[]
) {
  if (!href.includes('?obsidian-wikilink')) return null;
  const [pathAndQuery, anchor = ''] = href.split('#', 2);
  const encodedPath = pathAndQuery.replace('?obsidian-wikilink', '');
  let notePath = encodedPath;
  try {
    notePath = decodeURIComponent(encodedPath);
  } catch {
    // Keep the original value when a link contains malformed escaping.
  }
  const availablePaths = new Set(markdownPaths);
  const relativeTarget = resolveMarkdownTarget(
    `${notePath}${anchor ? `#${anchor}` : ''}`,
    currentPath,
    availablePaths
  );
  if (relativeTarget) return relativeTarget;
  const fileName = notePath.split('/').at(-1)?.toLowerCase();
  const matches = markdownPaths.filter(
    (path) => path.split('/').at(-1)?.toLowerCase() === fileName
  );
  return matches.length === 1 ? { path: matches[0], anchor, query: '' } : null;
}
