export interface SafeMarkmapNode {
  content: string;
  children: SafeMarkmapNode[];
  [key: string]: unknown;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function htmlToText(value: string) {
  const document = new DOMParser().parseFromString(value, 'text/html');
  return document.body.textContent ?? '';
}

/**
 * Markmap formats labels as HTML inside SVG foreignObjects. Reduce every label
 * to escaped text before handing the tree to the renderer so imported Markdown
 * cannot introduce active HTML, links, or images through that separate path.
 */
export function sanitizeMarkmapTree<T extends SafeMarkmapNode>(node: T): T {
  return {
    ...node,
    content: escapeHtml(htmlToText(node.content)),
    children: node.children.map((child) => sanitizeMarkmapTree(child)),
  } as T;
}

export function serializeMarkmapSvg(
  svg: SVGSVGElement,
  stylesheet: string,
  width: number,
  height: number
) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = stylesheet;
  clone.prepend(style);
  return new XMLSerializer().serializeToString(clone);
}
