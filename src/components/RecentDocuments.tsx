import { ClockCounterClockwiseIcon as ClockCounterClockwise } from '@phosphor-icons/react/ClockCounterClockwise';
import { FileTextIcon as FileText } from '@phosphor-icons/react/FileText';
import { TrashIcon as Trash } from '@phosphor-icons/react/Trash';
import type { RecentDocument } from '../lib/recentDocuments';

interface RecentDocumentsProps {
  entries: RecentDocument[];
  onClear: () => void;
  onOpen: (entry: RecentDocument) => void;
  onRemove: (id: string) => void;
  rememberFileAccess: boolean;
  onRememberFileAccess: (enabled: boolean) => void;
}

function sourceLabel(entry: RecentDocument) {
  if (entry.handle) return 'Ready to reopen';
  if (entry.sourceType === 'remote') return 'Public URL';
  if (entry.sourceType === 'bundled') return 'Built-in example';
  return 'Locate to reopen';
}

export default function RecentDocuments({
  entries,
  onClear,
  onOpen,
  onRemove,
  rememberFileAccess,
  onRememberFileAccess,
}: RecentDocumentsProps) {
  if (entries.length === 0) return null;
  return (
    <section className="recent-documents" aria-labelledby="recent-documents-title">
      <div className="recent-documents-heading">
        <div>
          <ClockCounterClockwise size={18} aria-hidden="true" />
          <h2 id="recent-documents-title">Recent documents</h2>
        </div>
        <button type="button" className="recent-clear" onClick={onClear}>
          Clear history
        </button>
      </div>
      <label className="recent-access-preference">
        <input
          type="checkbox"
          checked={rememberFileAccess}
          onChange={(event) => onRememberFileAccess(event.target.checked)}
        />
        <span>
          <strong>Remember file access</strong>
          <span>The browser may ask for permission again. File contents are never stored.</span>
        </span>
      </label>
      <div className="recent-document-list">
        {entries.map((entry) => (
          <div className="recent-document" key={entry.id}>
            <button
              type="button"
              className="recent-document-open"
              aria-label={`${entry.title}, ${sourceLabel(entry)}`}
              onClick={() => onOpen(entry)}
            >
              <FileText size={18} aria-hidden="true" />
              <span>
                <strong>{entry.title}</strong>
                <span>{sourceLabel(entry)}</span>
              </span>
            </button>
            <button
              type="button"
              className="recent-document-remove"
              aria-label={`Remove ${entry.title} from history`}
              onClick={() => onRemove(entry.id)}
            >
              <Trash size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
