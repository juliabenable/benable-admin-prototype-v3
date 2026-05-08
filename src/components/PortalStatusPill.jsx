import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Portal Status pill — exactly one of three states per spec (Katie, May 7):
 *   - "Not in Creator Program" (gray)
 *   - "Invited to Creator Program" (yellow)
 *   - "In Creator Program" (green, terminal)
 *
 * Now a real dropdown that lets ops transition between states. Selecting a
 * higher state fires the appropriate underlying event:
 *   Not → Invited: PORTAL_INVITE_SENT
 *   Invited → In Program: ONBOARDING_COMPLETED
 *   Not → In Program: PORTAL_INVITE_SENT then ONBOARDING_COMPLETED
 */

const STATES = [
  { id: 'NOT_IN_PROGRAM', label: 'Not in Creator Program', tone: 'gray' },
  { id: 'INVITED', label: 'Invited to Creator Program', tone: 'yellow' },
  { id: 'IN_PORTAL', label: 'In Creator Program', tone: 'green' },
];

export default function PortalStatusPill({ status, onTransition }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const activeId = status?.kind ?? 'NOT_IN_PROGRAM';
  const editable = !!onTransition; // Read-only when no handler provided

  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function pick(targetId, e) {
    e.stopPropagation();
    setOpen(false);
    if (targetId !== activeId) onTransition?.(activeId, targetId);
  }

  const tone = status?.color ?? 'gray';

  return (
    <span className="portal-status-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`portal-status-pill tone-${tone} ${editable ? 'editable' : 'terminal'} ${open ? 'open' : ''}`}
        onClick={editable ? (e) => { e.stopPropagation(); setOpen((v) => !v); } : undefined}
        aria-haspopup={editable ? 'listbox' : undefined}
        aria-expanded={editable ? open : undefined}
        disabled={!editable}
      >
        <span className="portal-status-pill-label">{status?.label ?? STATES[0].label}</span>
        {editable && <ChevronDown size={13} strokeWidth={2} className="portal-status-pill-chev" />}
      </button>
      {open && editable && (
        <div className="portal-status-menu" role="listbox">
          {STATES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="option"
              aria-selected={s.id === activeId}
              className={`portal-status-menu-item tone-${s.tone} ${s.id === activeId ? 'active' : ''}`}
              onClick={(e) => pick(s.id, e)}
            >
              <span className="portal-status-menu-dot" />
              <span className="portal-status-menu-label">{s.label}</span>
              {s.id === activeId && <Check size={13} strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
