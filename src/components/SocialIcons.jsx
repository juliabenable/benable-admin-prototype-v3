/**
 * Brand-correct social icons. lucide-react v1.6.0 doesn't include
 * Instagram or TikTok, so we ship inline SVG to keep the look consistent
 * with the screenshot reference. Benable icon is also bespoke.
 */

export function BenableIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-label="Benable profile"
      role="img"
    >
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#AE94F9" />
      <path
        d="M8.6 6.5h4.4c1.95 0 3.3 1.05 3.3 2.7 0 1-.55 1.7-1.5 2.05 1.2.3 1.95 1.1 1.95 2.35 0 1.85-1.4 3-3.6 3H8.6V6.5zm4.05 4.4c.85 0 1.4-.4 1.4-1.15s-.55-1.15-1.4-1.15h-1.85v2.3h1.85zm.25 4.05c1 0 1.6-.45 1.6-1.25 0-.85-.6-1.3-1.6-1.3h-2.1v2.55h2.1z"
        fill="white"
      />
    </svg>
  );
}

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
