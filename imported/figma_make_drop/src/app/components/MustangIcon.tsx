/**
 * MustangIcon — Cal Poly Mustang horse head silhouette.
 * Works at all sizes (9px–32px) as a filled icon.
 * Replaces generic star icons for ratings throughout the app.
 */
export function MustangIcon({
  size = 16,
  className = "",
  fill = "currentColor",
}: {
  size?: number;
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Simplified horse head silhouette — clean at all sizes */}
      <path d="M14.5 1.5c-.3 0-.7.3-.7.7 0 .5.2.9.5 1.2-.8.3-1.6.8-2.3 1.5C10.8 6 10 7.8 9.5 9.5c-.8.3-1.5.7-2.1 1.3C6.2 12 5.5 14 5.5 16v4c0 .6.4 1 1 1s1-.4 1-1v-2c0-.5.1-1 .3-1.5.5.8 1.2 1.5 2 2l.7.8v.7c0 .6.4 1 1 1s1-.4 1-1v-1.2c0-.3-.1-.5-.3-.7l-.9-1c-.6-.5-1-1.2-1.3-2 .2-.8.6-1.5 1.1-2.1.6-.7 1.4-1.2 2.2-1.5.3-.1.5-.3.6-.6.5-1.6 1.2-3.2 2.2-4.2.4-.4.8-.7 1.3-.9-.1.6.1 1.2.5 1.6.4.5 1 .8 1.6.8.4 0 .7-.1 1-.3.4.7.6 1.5.7 2.3.1 1-.1 2-.5 3-.3.6 0 1.3.6 1.5.6.3 1.3 0 1.5-.6.6-1.3.8-2.7.7-4.1-.1-1.3-.6-2.5-1.3-3.5.1-.4.1-.8 0-1.2-.2-.8-.7-1.5-1.4-1.8-.5-.3-1.1-.3-1.5-.2-.6-.3-1.3-.5-2-.5z" />
    </svg>
  );
}
