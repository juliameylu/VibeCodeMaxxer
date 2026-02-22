/**
 * JarvisLogo — Stylized "J" with a mountain silhouette behind it.
 * Reusable across Landing, BottomNav, Jarvis page, and Dashboard.
 */
export function JarvisLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Mountain silhouette */}
      <path
        d="M4 38L16 14L24 26L32 12L44 38H4Z"
        fill="currentColor"
        opacity="0.25"
      />
      {/* Mountain peak highlight */}
      <path
        d="M32 12L38 24L44 38H20L24 26L32 12Z"
        fill="currentColor"
        opacity="0.15"
      />
      {/* "J" letterform */}
      <text
        x="24"
        y="35"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontWeight="bold"
        fontStyle="italic"
        fontSize="28"
        fill="currentColor"
      >
        J
      </text>
    </svg>
  );
}
