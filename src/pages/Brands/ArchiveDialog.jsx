import { useState } from 'react';
import Modal from '../../components/Modal.jsx';

const REASONS = [
  { id: 'timing', label: 'Timing', help: 'Invited too long ago / no response in window' },
  { id: 'not-a-fit', label: 'Not a fit', help: 'Vertical, style, or aesthetic doesn\'t match this brand' },
  { id: 'not-open-to-gifted', label: 'Not open to gifted', help: 'Stated paid-only in onboarding' },
  { id: 'not-open-to-small-brands', label: 'Not open to small brands', help: 'Stated only-known-brands in onboarding' },
  { id: 'failed-onboarding', label: 'Failed onboarding', help: 'Stalled mid-onboarding, won\'t complete' },
  { id: 'other', label: 'Other', help: 'Specify in note' },
];

export default function ArchiveDialog({ brand, creator, onClose, onConfirm }) {
  const [reason, setReason] = useState('not-a-fit');
  const [note, setNote] = useState('');

  return (
    <Modal
      title={`Archive ${creator.name} from ${brand.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn primary"
            onClick={() => onConfirm({ reason, note: note.trim() || null })}
            disabled={reason === 'other' && !note.trim()}
          >
            Archive
          </button>
        </>
      }
    >
      <p className="muted small" style={{ marginTop: 0 }}>
        They'll stay in the general pool — this only removes them from <strong>{brand.name}</strong>'s pool.
      </p>

      <div className="archive-reasons">
        {REASONS.map((r) => (
          <label key={r.id} className={`archive-reason ${reason === r.id ? 'active' : ''}`}>
            <input
              type="radio"
              name="archive-reason"
              checked={reason === r.id}
              onChange={() => setReason(r.id)}
            />
            <span>
              <span className="archive-reason-label">{r.label}</span>
              <span className="archive-reason-help">{r.help}</span>
            </span>
          </label>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <label className="muted micro" style={{ display: 'block', marginBottom: 4 }}>
          Note {reason === 'other' && <span style={{ color: 'var(--pill-red-text)' }}>(required)</span>}
        </label>
        <textarea
          className="textarea"
          rows={2}
          placeholder="Optional context…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Modal>
  );
}
