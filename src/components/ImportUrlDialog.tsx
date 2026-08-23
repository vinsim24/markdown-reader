import { type FormEvent, useEffect, useRef, useState } from 'react';

const EXAMPLE_MARKDOWN_URL =
  'https://github.com/google-labs-code/design.md/blob/main/README.md';

interface ImportUrlDialogProps {
  onClose: () => void;
  onImport: (url: string) => Promise<void>;
}

export default function ImportUrlDialog({
  onClose,
  onImport,
}: ImportUrlDialogProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const dialog = panel.current;
    if (!dialog) return;
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, input, [href], [tabindex]:not([tabindex="-1"])'
        )
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', trapFocus);
    return () => dialog.removeEventListener('keydown', trapFocus);
  }, []);

  const importUrl = async (value: string) => {
    setError('');
    setLoading(true);
    try {
      await onImport(value);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'The Markdown import failed.'
      );
      setLoading(false);
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await importUrl(url);
  };

  return (
    <section
      ref={panel}
      className="import-url-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-url-title"
      aria-describedby="import-url-description"
    >
      <div className="settings-header">
        <div>
          <span className="eyebrow">Public source</span>
          <h2 id="import-url-title">Import from URL</h2>
        </div>
        <button
          type="button"
          className="close-button"
          onClick={onClose}
          aria-label="Close URL import"
        >
          ×
        </button>
      </div>
      <p id="import-url-description" className="import-url-description">
        Enter a public Markdown URL, GitHub repository, or GitHub README link.
        The browser fetches only the address you choose.
      </p>
      <form onSubmit={submit}>
        <label htmlFor="markdown-url">Markdown or GitHub URL</label>
        <input
          ref={input}
          id="markdown-url"
          type="text"
          inputMode="url"
          placeholder="https://example.com/README.md"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          disabled={loading}
          required
        />
        <small>
          GitHub shorthand such as owner/repository is also supported.
        </small>
        <div className="import-url-example">
          <span>No URL handy?</span>
          <button
            type="button"
            onClick={() => importUrl(EXAMPLE_MARKDOWN_URL)}
            disabled={loading}
          >
            Import design.md README
          </button>
        </div>
        {error && (
          <p className="import-url-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="welcome-primary" disabled={loading}>
          {loading ? 'Importing…' : 'Import Markdown'}
        </button>
      </form>
    </section>
  );
}
