import { TODAY_ISO } from '../domain/selectors.js';

const TODAY_MS = Date.parse(TODAY_ISO);

// Per Katie/Julia (May 7): all timestamps render in Pacific time so the team
// has one universal time zone instead of mixing local times.
const TZ = 'America/Los_Angeles';

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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ });
}

export function formatFullDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZone: TZ, timeZoneName: 'short',
  });
}

// Compact date+time display matching screenshot: "3/22, 2:30 PM"
export function formatDateTimeShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZone: TZ,
  });
}

// Slightly longer with month abbr, used by Activity feed
export function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZone: TZ,
  });
}

export default function RelativeTime({ iso }) {
  return <span title={formatFullDate(iso)}>{formatRelative(iso)}</span>;
}
