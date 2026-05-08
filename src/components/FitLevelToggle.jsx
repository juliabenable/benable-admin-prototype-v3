/**
 * Inline three-segment toggle for the per-brand fit level.
 * Maps the underlying brand-pool status to one of three labels:
 *   - qualified         → "Good fit"
 *   - confirmed/potential → "Potential fit"
 *   - archived          → "Not a fit"
 *
 * Click any segment to fire onChange(level), where level is one of:
 *   'good' | 'potential' | 'not-a-fit'
 *
 * Per Katie May 7: replaces the previous static pill / 4-segment control.
 */

const SEGMENTS = [
  { id: 'good',       label: 'Good fit',      tone: 'green'  },
  { id: 'potential',  label: 'Potential fit', tone: 'purple' },
  { id: 'not-a-fit',  label: 'Not a fit',     tone: 'gray'   },
];

// Translate the underlying brand-pool status → fit segment id
export function statusToFitLevel(status) {
  if (status === 'qualified') return 'good';
  if (status === 'archived') return 'not-a-fit';
  // confirmed + potential both surface as 'potential fit'
  return 'potential';
}

export default function FitLevelToggle({ status, onChange, size = 'md' }) {
  const active = statusToFitLevel(status);
  return (
    <div className={`fit-toggle ${size === 'sm' ? 'sm' : ''}`}>
      {SEGMENTS.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`fit-toggle-btn tone-${s.tone} ${active === s.id ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onChange?.(s.id);
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

export { SEGMENTS as FIT_SEGMENTS };
