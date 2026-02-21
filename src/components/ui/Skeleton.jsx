export default function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-white/70 ${className}`.trim()} />;
}
