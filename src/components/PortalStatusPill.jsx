import { ChevronDown } from 'lucide-react';

/**
 * Portal Status pill — exactly one of three states per spec (Katie, May 7):
 *  - "Not in Creator Program" (gray, with chevron — editable)
 *  - "Invited to Creator Program" (yellow, with chevron — editable)
 *  - "In Creator Program" (green, no chevron — terminal positive state)
 *
 * Visual matches the screenshot reference. The chevron is a hint that ops
 * could change the state (interactive override), even if not wired in v1.
 */
export default function PortalStatusPill({ status }) {
  const tone = status.color; // 'gray' | 'yellow' | 'green'
  const editable = status.kind !== 'IN_PORTAL';
  return (
    <span className={`portal-status-pill tone-${tone} ${editable ? 'editable' : 'terminal'}`}>
      <span className="portal-status-pill-label">{status.label}</span>
      {editable && <ChevronDown size={13} strokeWidth={2} className="portal-status-pill-chev" />}
    </span>
  );
}
