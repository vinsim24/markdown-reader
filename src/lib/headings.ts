import GithubSlugger from 'github-slugger';
import type { Element, Root } from 'hast';
import type { Heading, Root as MdastRoot } from 'mdast';
import { toString } from 'mdast-util-to-string';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { unified } from 'unified';

export interface DocumentHeading {
  text: string;
  level: number;
  id: string;
}

export function extractHeadings(markdown: string): DocumentHeading[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as MdastRoot;
  const slugger = new GithubSlugger();
  const headings: DocumentHeading[] = [];
  const visit = (node: MdastRoot | MdastRoot['children'][number]) => {
    if (node.type === 'heading') {
      const heading = node as Heading;
      const text = toString(heading);
      headings.push({ text, level: heading.depth, id: slugger.slug(text) });
    }
    if ('children' in node) node.children.forEach(visit);
  };
  visit(tree);
  return headings;
}

function elementText(node: Element): string {
  return node.children
    .map((child) => child.type === 'text' ? child.value : child.type === 'element' ? elementText(child) : '')
    .join('');
}

export function rehypeHeadingIds() {
  return (tree: Root) => {
    const slugger = new GithubSlugger();
    const visit = (node: Root | Element) => {
      for (const child of node.children) {
        if (child.type !== 'element') continue;
        if (/^h[1-6]$/.test(child.tagName)) child.properties.id = slugger.slug(elementText(child));
        visit(child);
      }
    };
    visit(tree);
  };
}

