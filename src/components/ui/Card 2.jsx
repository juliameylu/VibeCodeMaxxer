export default function Card({ children, className = "" }) {
  return <section className={`row-pill ${className}`.trim()}>{children}</section>;
}
