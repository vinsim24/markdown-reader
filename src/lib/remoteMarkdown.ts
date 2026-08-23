const MAX_REMOTE_MARKDOWN_BYTES = 2 * 1024 * 1024;

export interface RemoteMarkdownDocument {
  markdown: string;
  sourceUrl: string;
  title: string;
}

type FetchRemote = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

function githubRawUrl(url: URL) {
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) return null;
  const [owner, repository] = segments;
  if (!owner || !repository) return null;
  if (segments.length === 2) {
    return new URL(
      `https://raw.githubusercontent.com/${owner}/${repository}/HEAD/README.md`
    );
  }
  if (segments[2] === 'blob' && segments[3] && segments.length > 4) {
    return new URL(
      `https://raw.githubusercontent.com/${owner}/${repository}/${segments
        .slice(3)
        .join('/')}`
    );
  }
  return null;
}

export function normalizeRemoteMarkdownUrl(input: string) {
  const value = input.trim();
  if (!value) throw new Error('Enter a public Markdown or GitHub URL.');
  const ownerRepository = value.match(/^([\w.-]+)\/([\w.-]+)$/);
  const candidate = ownerRepository
    ? `https://github.com/${ownerRepository[1]}/${ownerRepository[2]}`
    : value;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('Enter a complete http or https URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only http and https URLs are supported.');
  }
  if (url.username || url.password) {
    throw new Error('URLs containing credentials are not supported.');
  }
  url.hash = '';
  if (url.hostname.toLowerCase() === 'github.com') {
    const rawUrl = githubRawUrl(url);
    if (!rawUrl) {
      throw new Error(
        'Use a GitHub repository URL or a direct link to a Markdown file.'
      );
    }
    return rawUrl;
  }
  return url;
}

function documentTitle(url: URL) {
  const segments = url.pathname.split('/').filter(Boolean);
  const last = segments.at(-1);
  if (last && /\.(md|markdown)$/i.test(last)) return decodeURIComponent(last);
  return 'Imported Markdown.md';
}

export async function fetchRemoteMarkdown(
  input: string,
  fetchRemote: FetchRemote = fetch
): Promise<RemoteMarkdownDocument> {
  const url = normalizeRemoteMarkdownUrl(input);
  let response: Response;
  try {
    response = await fetchRemote(url, {
      credentials: 'omit',
      headers: { Accept: 'text/markdown, text/plain;q=0.9, */*;q=0.1' },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
    });
  } catch {
    throw new Error(
      'The URL could not be fetched. The site may block browser requests with CORS.'
    );
  }
  if (!response.ok) {
    throw new Error(`The URL returned HTTP ${response.status}.`);
  }
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_REMOTE_MARKDOWN_BYTES) {
    throw new Error('The Markdown file is larger than the 2 MB import limit.');
  }
  const contentType = response.headers.get('content-type')?.toLowerCase() || '';
  if (
    contentType &&
    !contentType.startsWith('text/') &&
    !contentType.includes('markdown') &&
    !contentType.includes('octet-stream')
  ) {
    throw new Error(`The URL returned unsupported content: ${contentType}.`);
  }
  const markdown = await response.text();
  if (
    new TextEncoder().encode(markdown).byteLength > MAX_REMOTE_MARKDOWN_BYTES
  ) {
    throw new Error('The Markdown file is larger than the 2 MB import limit.');
  }
  if (!markdown.trim()) throw new Error('The URL returned an empty document.');
  return {
    markdown,
    sourceUrl: url.href,
    title: documentTitle(url),
  };
}
