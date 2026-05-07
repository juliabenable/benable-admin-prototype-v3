import { useState } from 'react';
import { Upload as UploadIcon, FileJson } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import { useEventStore } from '../../store/useEventStore.jsx';
import { useToast } from '../../components/Toast.jsx';
import { EVENT_TYPES as E } from '../../domain/events.js';

function normalizeHandle(h) {
  if (!h) return '';
  return h.trim().toLowerCase().replace(/^@+/, '');
}
function normalizeEmail(e) {
  return (e ?? '').trim().toLowerCase();
}

const colors = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W'];

export default function UploadDialog({ onClose }) {
  const { creators, addCreator, appendEvent } = useEventStore();
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  function handleFile(file) {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) throw new Error('Expected a top-level JSON array');
        const r = analyze(parsed);
        setReport(r);
      } catch (e) {
        setError(e.message ?? 'Failed to parse JSON');
      }
    };
    reader.readAsText(file);
  }

  function analyze(rows) {
    const handleSet = new Map(creators.map((c) => [normalizeHandle(c.handle), c]));
    const emailSet = new Map(creators.map((c) => [normalizeEmail(c.email), c]));
    const newRows = [];
    const dupRows = [];
    for (const row of rows) {
      const handleKey = normalizeHandle(row.handle);
      const emailKey = normalizeEmail(row.email);
      const dup = (handleKey && handleSet.get(handleKey)) || (emailKey && emailSet.get(emailKey));
      if (dup) {
        dupRows.push({ row, existing: dup });
      } else {
        newRows.push(row);
      }
    }
    return { newRows, dupRows, total: rows.length };
  }

  function confirmImport() {
    if (!report) return;
    const taken = new Set(creators.map((c) => c.id));
    let counter = 0;
    for (const row of report.newRows) {
      counter += 1;
      let id = `cr_u${Date.now().toString(36)}_${counter}`;
      while (taken.has(id)) id = `${id}x`;
      const handle = row.handle?.startsWith('@') ? row.handle : `@${row.handle}`;
      const creator = {
        id,
        name: row.name ?? handle,
        firstName: (row.name ?? handle).split(' ')[0],
        handle,
        email: row.email ?? '',
        phone: row.phone ?? '',
        avatarColor: colors[counter % colors.length],
        socials: row.socials ?? ['instagram'],
        followerCount: row.followerCount ?? row.followers ?? 0,
        engagementRate: row.engagementRate ?? row.engagement ?? 0,
        audience: {
          location: row.audienceLocation ?? row.location ?? 'United States',
          genderFemalePct: row.audienceGenderFemalePct ?? null,
          ageRange: row.audienceAgeRange ?? null,
        },
        categories: row.categories ?? [],
        preferences: {
          about: row.bio ?? '',
          workWith: '', avoid: '', giftedOpenness: '',
          smallBrands: null, smallBrandsNote: '',
          unknownBrands: null, unknownBrandsNote: '',
          dreamHousehold: '', dreamNiche: '', dreamLocal: '',
        },
        onboardingStatus: 'pending',
      };
      addCreator(creator);
      appendEvent({
        type: E.CREATOR_ADDED,
        creatorId: id,
        actor: { kind: 'ops', name: 'Julia' },
        payload: { source: 'upload' },
      });
    }
    toast(`Imported ${report.newRows.length} creators · skipped ${report.dupRows.length} duplicates`);
    onClose?.();
  }

  return (
    <Modal
      title="Upload creators"
      onClose={onClose}
      wide
      footer={
        report ? (
          <>
            <button type="button" className="btn ghost" onClick={() => setReport(null)}>Pick a different file</button>
            <button
              type="button"
              className="btn primary"
              onClick={confirmImport}
              disabled={report.newRows.length === 0}
            >
              Import {report.newRows.length} creator{report.newRows.length === 1 ? '' : 's'}
            </button>
          </>
        ) : (
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        )
      }
    >
      {!report && (
        <div className="upload-empty">
          <UploadIcon size={36} strokeWidth={1.5} />
          <p style={{ marginTop: 8 }}>Upload a JSON file of creators.</p>
          <p className="muted small" style={{ marginBottom: 16 }}>
            We detect duplicates by handle or email before writing anything.
          </p>
          <label className="btn secondary">
            <FileJson size={14} /> Choose JSON file
            <input
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
          <a href="/sample-upload.json" download className="btn ghost small" style={{ marginTop: 12 }}>
            Download sample template
          </a>
          {error && <div className="upload-error">⚠ {error}</div>}
        </div>
      )}

      {report && (
        <div className="upload-report">
          <div className="upload-summary">
            <div className="upload-summary-row">
              <span className="upload-summary-num green">{report.newRows.length}</span>
              <span>new creators to import</span>
            </div>
            <div className="upload-summary-row">
              <span className="upload-summary-num yellow">{report.dupRows.length}</span>
              <span>duplicates skipped</span>
            </div>
          </div>

          {report.dupRows.length > 0 && (
            <div className="upload-section">
              <h4>Duplicates skipped</h4>
              <ul className="upload-list">
                {report.dupRows.map((d, i) => (
                  <li key={i} className="upload-row">
                    <div>
                      <div className="upload-row-name">{d.row.name ?? d.row.handle}</div>
                      <div className="muted small">{d.row.handle}</div>
                    </div>
                    <div className="muted small">
                      Already exists as <strong>{d.existing.name}</strong> ({d.existing.handle})
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.newRows.length > 0 && (
            <div className="upload-section">
              <h4>Will be added</h4>
              <ul className="upload-list">
                {report.newRows.map((r, i) => (
                  <li key={i} className="upload-row">
                    <div>
                      <div className="upload-row-name">{r.name ?? r.handle}</div>
                      <div className="muted small">{r.handle} · {r.email ?? '—'}</div>
                    </div>
                    <span className="muted small">New</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
