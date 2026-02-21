export default function EmptyState({ title, message, action }) {
  return (
    <div className="glass-card p-5 text-center">
      <p className="text-base font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-soft">{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
