export default function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-soft">{subtitle}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </div>
  );
}
