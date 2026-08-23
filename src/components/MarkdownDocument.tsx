import type { Element, Root, RootContent, Text } from 'hast';
import { isValidElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeCodeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { rehypeHeadingIds } from '../lib/headings';
import { isExternalUrl } from '../lib/paths';
import type { Theme } from '../lib/preferences';
import CodeBlock from './CodeBlock';
import LocalImage from './LocalImage';
import MathExpression from './MathExpression';
import MermaidDiagram from './MermaidDiagram';

const markdownSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'abbr', 'mark'],
  attributes: {
    ...defaultSchema.attributes,
    code: [['className', /^language-./, 'math-inline', 'math-display']],
  },
};

function rehypeSearchHighlight(search: string) {
  return (tree: Root) => {
    const query = search.trim().toLowerCase();
    if (!query) return;

    const highlight = (node: Root | Element, excluded = false) => {
      const skip =
        excluded ||
        (node.type === 'element' && ['code', 'pre'].includes(node.tagName));
      const children: RootContent[] = [];

      for (const child of node.children) {
        if (child.type === 'element') highlight(child, skip);
        if (skip || child.type !== 'text') {
          children.push(child);
          continue;
        }

        let offset = 0;
        let match = child.value.toLowerCase().indexOf(query);
        while (match !== -1) {
          if (match > offset) {
            children.push({
              type: 'text',
              value: child.value.slice(offset, match),
            } as Text);
          }
          children.push({
            type: 'element',
            tagName: 'mark',
            properties: {},
            children: [
              {
                type: 'text',
                value: child.value.slice(match, match + query.length),
              },
            ],
          });
          offset = match + query.length;
          match = child.value.toLowerCase().indexOf(query, offset);
        }
        if (offset < child.value.length) {
          children.push({
            type: 'text',
            value: child.value.slice(offset),
          } as Text);
        }
      }

      node.children = children;
    };

    highlight(tree);
  };
}

interface MarkdownDocumentProps {
  activePath: string;
  files?: Map<string, File>;
  markdown: string;
  onRelativeLink: (href: string) => void;
  search: string;
  theme: Theme;
}

export default function MarkdownDocument({
  activePath,
  files,
  markdown,
  onRelativeLink,
  search,
  theme,
}: MarkdownDocumentProps) {
  return (
    <article className="reader">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, markdownSanitizeSchema],
          [rehypeCodeHighlight, { plainText: ['math', 'mermaid'] }],
          rehypeHeadingIds,
          [rehypeSearchHighlight, search],
        ]}
        components={{
          pre: ({ children }) => {
            const code = isValidElement<{
              className?: string;
              children?: ReactNode;
            }>(children)
              ? children
              : null;
            const classes = code?.props.className?.split(/\s+/) || [];
            if (code && classes.includes('language-mermaid')) {
              return (
                <MermaidDiagram
                  source={String(code.props.children).replace(/\n$/, '')}
                  theme={theme}
                />
              );
            }
            if (code && classes.includes('math-display')) {
              return (
                <MathExpression
                  display
                  source={String(code.props.children).replace(/\n$/, '')}
                />
              );
            }
            return code ? (
              <CodeBlock className={code.props.className}>
                {code.props.children}
              </CodeBlock>
            ) : (
              <pre>{children}</pre>
            );
          },
          code: ({ className, children }) =>
            className?.split(/\s+/).includes('math-inline') ? (
              <MathExpression
                display={false}
                source={String(children).replace(/\n$/, '')}
              />
            ) : (
              <code className={className}>{children}</code>
            ),
          a: ({ href = '', children, ...props }) => {
            if (href.startsWith('#')) {
              return (
                <a href={href} {...props}>
                  {children}
                </a>
              );
            }
            if (/^https?:\/\//i.test(href)) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                >
                  {children}
                </a>
              );
            }
            if (isExternalUrl(href)) {
              return (
                <a href={href} {...props}>
                  {children}
                </a>
              );
            }
            return (
              <button
                type="button"
                className="relative-link"
                onClick={() => onRelativeLink(href)}
              >
                {children}
              </button>
            );
          },
          img: ({ src, alt }) => (
            <LocalImage
              src={src}
              alt={alt}
              currentPath={activePath}
              files={files}
            />
          ),
          input: ({ checked, ...props }) => (
            <input
              {...props}
              checked={checked}
              aria-label={checked ? 'Completed task' : 'Incomplete task'}
            />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
