export default function Toast({ toast, onHide }) {
  if (!toast) return null;
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };
  return (
    <div className={`toast ${toast.type}`} role="alert">
      <span style={{ fontWeight: 700, fontSize: 16 }}>{icons[toast.type] || '•'}</span>
      <span>{toast.message}</span>
      <button
        onClick={onHide}
        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}
      >
        ×
      </button>
    </div>
  );
}
