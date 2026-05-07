const PALETTE = {
  A: { bg: '#FED7AA', fg: '#9A3412' },  // warm orange
  B: { bg: '#BBF7D0', fg: '#15803D' },  // green
  C: { bg: '#DDD6FE', fg: '#5B21B6' },  // purple
  D: { bg: '#FCE7F3', fg: '#9D174D' },  // pink
  E: { bg: '#BAE6FD', fg: '#075985' },  // blue
  F: { bg: '#FEF3C7', fg: '#92400E' },  // yellow
};

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function BrandLogo({ brand, size = 40 }) {
  const palette = PALETTE[brand.logoColor] ?? PALETTE.A;
  return (
    <div
      className="brand-logo"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.25,
        background: palette.bg,
        color: palette.fg,
        fontSize: size * 0.36,
      }}
    >
      {initials(brand.name)}
    </div>
  );
}
