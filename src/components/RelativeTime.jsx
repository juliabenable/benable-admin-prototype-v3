import { TODAY_ISO } from '../domain/selectors.js';

const TODAY_MS = Date.parse(TODAY_ISO);

export function formatRelative(iso) {
  if (!iso) return '';
  const ms = Date.parse(iso);
  const diffMin = Math.round((TODAY_MS - ms) / 60000);
  if (diffMin < 60) return `${Math.max(0, diffMin)}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatFullDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function RelativeTime({ iso }) {
  return <span title={formatFullDate(iso)}>{formatRelative(iso)}</span>;
}
