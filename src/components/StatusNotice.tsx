interface StatusNoticeProps {
  message: string;
  onDismiss: () => void;
}

export default function StatusNotice({
  message,
  onDismiss,
}: StatusNoticeProps) {
  if (!message) return null;
  return (
    <div className="link-notice" role="status">
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss message">
        ×
      </button>
    </div>
  );
}
