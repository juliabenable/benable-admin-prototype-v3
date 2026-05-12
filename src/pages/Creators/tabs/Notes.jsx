import { useEffect, useMemo, useRef, useState } from 'react';
import { StickyNote } from 'lucide-react';
import { useEventStore } from '../../../store/useEventStore.jsx';
import { selectActivityFeed } from '../../../domain/selectors.js';
import { useToast } from '../../../components/Toast.jsx';
import { formatDateTimeShort } from '../../../components/RelativeTime.jsx';
import { EVENT_TYPES as E } from '../../../domain/events.js';

/**
 * Dedicated Notes tab. Extracted from Overview per Katie May 8 — notes get
 * their own tab with a count so ops can manage them as a first-class concept.
 */
export default function NotesTab({ creator, focusKey }) {
  const { events, appendEvent } = useEventStore();
  const toast = useToast();

  const notes = useMemo(
    () => selectActivityFeed(events, creator.id).filter((e) => e.type === E.NOTE_ADDED),
    [events, creator.id],
  );

  const [body, setBody] = useState('');
  const [focused, setFocused] = useState(false);
  const taRef = useRef(null);

  // If the Notes tab is opened via the "Note" action button, auto-focus the composer
  useEffect(() => {
    if (focusKey) {
      setFocused(true);
      // wait for textarea to mount
      setTimeout(() => taRef.current?.focus(), 30);
    }
  }, [focusKey]);

  function save() {
    const trimmed = body.trim();
    if (!trimmed) return;
    appendEvent({
      type: E.NOTE_ADDED,
      creatorId: creator.id,
      actor: { kind: 'ops', name: 'Julia' },
      payload: { body: trimmed },
    });
    setBody('');
    setFocused(false);
    toast('Note added');
  }

  return (
    <div className="notes-tab">
      <div className={`notes-compose ${(focused || body) ? 'expanded' : ''}`}>
        {(focused || body) ? (
          <textarea
            ref={taRef}
            autoFocus
            className="textarea"
            placeholder="Add a note..."
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => { if (!body) setFocused(false); }}
          />
        ) : (
          <input
            className="input"
            placeholder="Add a note..."
            onFocus={() => setFocused(true)}
            readOnly
          />
        )}
        <button
          type="button"
          className="btn primary small"
          disabled={!body.trim()}
          onClick={save}
        >
          Add
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="tab-empty">
          <StickyNote size={28} className="muted" />
          <p className="muted small" style={{ marginTop: 8 }}>No notes yet.</p>
        </div>
      ) : (
        <ul className="notes-list">
          {notes.map((n) => (
            <li key={n.id} className="note-card">
              <div className="note-meta">
                <span className="note-author">{n.actor?.name ?? 'Ops'}</span>
                <span className="muted small">{formatDateTimeShort(n.timestamp)}</span>
              </div>
              <div className="note-body">{n.payload?.body}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
