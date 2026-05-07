import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEventStore } from '../../store/useEventStore.jsx';
import { useToast } from '../../components/Toast.jsx';
import { selectBrandNotes } from '../../domain/selectors.js';
import { EVENT_TYPES as E } from '../../domain/events.js';
import RelativeTime from '../../components/RelativeTime.jsx';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BrandAbout() {
  const { brandId } = useParams();
  const { brands, events, appendEvent } = useEventStore();
  const toast = useToast();
  const brand = brands.find((b) => b.id === brandId);
  const [noteBody, setNoteBody] = useState('');

  const notes = useMemo(() => selectBrandNotes(events, brandId), [events, brandId]);

  function saveNote() {
    const body = noteBody.trim();
    if (!body) return;
    appendEvent({
      type: E.BRAND_NOTE_ADDED,
      brandId,
      actor: { kind: 'ops', name: 'Julia' },
      payload: { body },
    });
    setNoteBody('');
    toast('Note added');
  }

  if (!brand) return null;

  return (
    <div className="brand-about-page">
      <div className="brand-about-grid">
        <section className="brand-about-section">
          <h3>Context</h3>
          <dl className="brand-about-dl">
            <dt>Provenance</dt>
            <dd>{brand.provenance}</dd>
            <dt>Relationship</dt>
            <dd>{brand.relationshipType}{brand.agency ? ` · via ${brand.agency}` : ''}</dd>
            <dt>Description</dt>
            <dd>{brand.description}</dd>
          </dl>
        </section>

        <section className="brand-about-section">
          <h3>Contact</h3>
          <dl className="brand-about-dl">
            <dt>Primary contact</dt>
            <dd>{brand.contactName}</dd>
            <dt>Email</dt>
            <dd>{brand.contactEmail}</dd>
            {brand.agency && (
              <>
                <dt>Agency</dt>
                <dd>{brand.agency}</dd>
              </>
            )}
          </dl>
        </section>

        <section className="brand-about-section">
          <h3>Commercial</h3>
          <dl className="brand-about-dl">
            <dt>Model</dt>
            <dd>{brand.paid ? 'Paid' : 'Gifted only'}</dd>
            <dt>Rate</dt>
            <dd>{brand.rate ?? '—'}</dd>
            <dt>Subscribed since</dt>
            <dd>{formatDate(brand.subscribedSince)}</dd>
          </dl>
        </section>

        <section className="brand-about-section">
          <h3>Performance</h3>
          <dl className="brand-about-dl">
            <dt>Avg campaigns per month</dt>
            <dd>{brand.monthlyCampaigns ?? '—'}</dd>
            <dt>Avg invite-to-accept</dt>
            <dd>{brand.avgInviteToAccept != null ? `${Math.round(brand.avgInviteToAccept * 100)}%` : '—'}</dd>
          </dl>
        </section>
      </div>

      <section className="brand-about-section brand-notes-section">
        <h3>Notes</h3>
        <div className="brand-note-compose">
          <textarea
            className="textarea"
            placeholder="Add a note about this brand…"
            rows={2}
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
          />
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn primary small" onClick={saveNote} disabled={!noteBody.trim()}>
              Save note
            </button>
          </div>
        </div>

        {notes.length === 0 ? (
          <p className="muted small">No notes yet.</p>
        ) : (
          <ul className="brand-notes-list">
            {notes.map((n) => (
              <li key={n.id} className="brand-note">
                <div className="brand-note-meta">
                  <span className="brand-note-author">{n.actor?.name ?? 'Ops'}</span>
                  <span className="muted">·</span>
                  <span className="muted small"><RelativeTime iso={n.timestamp} /></span>
                </div>
                <div className="brand-note-body">{n.payload?.body}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
