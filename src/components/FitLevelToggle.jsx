import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Dropdown-style fit-level pill.
 *   - qualified         → "Good fit"
 *   - confirmed/potential → "Potential fit"
 *   - archived          → "Not a fit"
 *
 * Click the pill → opens a small menu listing all 3 options. Pick one
 * to fire onChange(level), where level ∈ 'good' | 'potential' | 'not-a-fit'.
 *
 * Per Katie May 7: replaces the inline 3-segment control with a single
 * compact pill + dropdown so it doesn't dominate the row width.
 */

const SEGMENTS = [
  { id: 'good',       label: 'Good fit',      tone: 'green'  },
  { id: 'potential',  label: 'Potential fit', tone: 'purple' },
  { id: 'not-a-fit',  label: 'Not a fit',     tone: 'gray'   },
];

export function statusToFitLevel(status) {
  if (status === 'qualified') return 'good';
  if (status === 'archived') return 'not-a-fit';
  return 'potential';
}

export default function FitLevelToggle({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const activeId = statusToFitLevel(status);
  const activeMeta = SEGMENTS.find((s) => s.id === activeId) ?? SEGMENTS[1];

  // Close on outside click
  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function pick(level, e) {
    e.stopPropagation();
    setOpen(false);
    if (level !== activeId) onChange?.(level);
  }

  return (
    <span className="fit-toggle-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`fit-pill tone-${activeMeta.tone} ${open ? 'open' : ''}`}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {activeMeta.label}
        <ChevronDown size={12} strokeWidth={2.25} className="fit-pill-chev" />
      </button>
      {open && (
        <div className="fit-pill-menu" role="listbox">
          {SEGMENTS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="option"
              aria-selected={s.id === activeId}
              className={`fit-pill-menu-item tone-${s.tone} ${s.id === activeId ? 'active' : ''}`}
              onClick={(e) => pick(s.id, e)}
            >
              <span className="fit-pill-menu-dot" />
              <span className="fit-pill-menu-label">{s.label}</span>
              {s.id === activeId && <Check size={13} strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

export { SEGMENTS as FIT_SEGMENTS };
