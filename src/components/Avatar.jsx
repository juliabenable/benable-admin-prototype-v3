const PALETTE = {
  A: '#F5D0FE', B: '#BAE6FD', C: '#BBF7D0', D: '#FECACA',
  E: '#FED7AA', F: '#FEF3C7', G: '#DDD6FE', H: '#FCE7F3',
  I: '#A7F3D0', J: '#FDE68A', K: '#C7D2FE', L: '#FBCFE8',
  M: '#A5F3FC', N: '#D9F99D', O: '#FECDD3', P: '#E9D5FF',
  Q: '#FDBA74', R: '#86EFAC', S: '#93C5FD', T: '#F9A8D4',
  U: '#FCD34D', V: '#67E8F9', W: '#D8B4FE',
};

function initialsFromName(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ creator, size = 32 }) {
  const initials = initialsFromName(creator.name);
  const bg = PALETTE[creator.avatarColor] ?? '#EBE4FF';
  return (
    <span
      className={`avatar size-${size}`}
      style={{ backgroundColor: bg, color: '#3B0764' }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
