/**
 * Brand-correct social icons. lucide-react v1.6.0 doesn't include
 * Instagram or TikTok, so we ship inline SVG to keep the look consistent
 * with the screenshot reference.
 */

export function InstagramIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-label="Instagram"
      role="img"
    >
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#FCAF45" />
          <stop offset="35%" stopColor="#E1306C" />
          <stop offset="70%" stopColor="#C13584" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad)" />
      <circle cx="12" cy="12" r="4.6" fill="none" stroke="white" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
    </svg>
  );
}

export function TikTokIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-label="TikTok"
      role="img"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#010101" />
      {/* Pink shadow */}
      <path
        d="M16.6 9.7v3.55a4.6 4.6 0 1 1-4.6-4.6h.85V11.7h-.85a1.55 1.55 0 1 0 1.55 1.55V5.5h2.4c0 1.55 1.7 2.6 2.65 2.6V9.9c-.7 0-1.35-.07-2-.2z"
        fill="#FF0050"
        transform="translate(0.5,0.5)"
        opacity="0.85"
      />
      {/* Cyan shadow */}
      <path
        d="M16.6 9.7v3.55a4.6 4.6 0 1 1-4.6-4.6h.85V11.7h-.85a1.55 1.55 0 1 0 1.55 1.55V5.5h2.4c0 1.55 1.7 2.6 2.65 2.6V9.9c-.7 0-1.35-.07-2-.2z"
        fill="#00F2EA"
        transform="translate(-0.5,-0.5)"
        opacity="0.85"
      />
      {/* White note */}
      <path
        d="M16.6 9.7v3.55a4.6 4.6 0 1 1-4.6-4.6h.85V11.7h-.85a1.55 1.55 0 1 0 1.55 1.55V5.5h2.4c0 1.55 1.7 2.6 2.65 2.6V9.9c-.7 0-1.35-.07-2-.2z"
        fill="white"
      />
    </svg>
  );
}
