import { useState } from 'react';
import { Upload as UploadIcon, FileJson } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import { useEventStore } from '../../store/useEventStore.jsx';
import { useToast } from '../../components/Toast.jsx';
import { selectCreatorStatus } from '../../domain/selectors.js';
import { EVENT_TYPES as E } from '../../domain/events.js';

function normalizeHandle(h) {
  return (h ?? '').trim().toLowerCase().replace(/^@+/, '');
}
function normalizeEmail(e) {
  return (e ?? '').trim().toLowerCase();
}

const colors = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W'];

export default function BrandPoolUploadDialog({ brand, onClose }) {
  const { creators, events, campaigns, addCreator, appendEvent } = useEventStore();
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
        setReport(analyze(parsed));
      } catch (e) {
        setError(e.message ?? 'Failed to parse JSON');
      }
    };
    reader.readAsText(file);
  }

  function analyze(rows) {
    const handleMap = new Map(creators.map((c) => [normalizeHandle(c.handle), c]));
    const emailMap = new Map(creators.map((c) => [normalizeEmail(c.email), c]));

    const newRows = [];   // brand-new creators
    const existingRows = []; // creators already in the system; will be auto-stamped with portal status

    for (const row of rows) {
      const handleKey = normalizeHandle(row.handle);
      const emailKey = normalizeEmail(row.email);
      const existing = (handleKey && handleMap.get(handleKey)) || (emailKey && emailMap.get(emailKey));
      if (existing) {
        const status = selectCreatorStatus(events, existing.id, campaigns);
        existingRows.push({ row, existing, portalStatus: status });
      } else {
        newRows.push(row);
      }
    }
    return { newRows, existingRows, total: rows.length };
  }

  function confirmImport() {
    if (!report) return;

    let counter = 0;
    const taken = new Set(creators.map((c) => c.id));

    // 1. Create new creator records (and add CREATOR_ADDED events)
    for (const row of report.newRows) {
      counter += 1;
      let id = `cr_u${Date.now().toString(36)}_${counter}`;
      while (taken.has(id)) id = `${id}x`;
      const handle = (row.handle ?? '').startsWith('@') ? row.handle : `@${row.handle}`;
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
        payload: { source: 'logan-import' },
      });
      // Add to brand pool as Potential
      appendEvent({
        type: E.BRAND_POOL_ADDED,
        creatorId: id,
        brandId: brand.id,
        actor: { kind: 'ops', name: 'Julia' },
        payload: { source: 'logan-import' },
      });
    }

    // 2. For existing creators, add to brand pool only (don't recreate)
    for (const { existing } of report.existingRows) {
      // Skip if already in this brand's pool
      const alreadyInPool = events.some((e) =>
        e.creatorId === existing.id && e.brandId === brand.id
        && (e.type === E.BRAND_POOL_ADDED || e.type === E.BRAND_POOL_QUALIFIED || e.type === E.BRAND_POOL_ARCHIVED)
      );
      if (alreadyInPool) continue;
      appendEvent({
        type: E.BRAND_POOL_ADDED,
        creatorId: existing.id,
        brandId: brand.id,
        actor: { kind: 'ops', name: 'Julia' },
        payload: { source: 'logan-import' },
      });
    }

    toast(`Added ${report.newRows.length + report.existingRows.length} creators to ${brand.name} pool`);
    onClose?.();
  }

  return (
    <Modal
      title={`Upload to ${brand.name} pool`}
      onClose={onClose}
      wide
      footer={
        report ? (
          <>
            <button type="button" className="btn ghost" onClick={() => setReport(null)}>Pick a different file</button>
            <button type="button" className="btn primary" onClick={confirmImport}>
              Add {report.newRows.length + report.existingRows.length} to pool
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
          <p style={{ marginTop: 8 }}>Upload a JSON file from Logan's tool.</p>
          <p className="muted small" style={{ marginBottom: 16 }}>
            We'll auto-stamp each creator's portal status and add them all as <strong>Potential</strong> for {brand.name}.
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
              <span>new creators (will be added)</span>
            </div>
            <div className="upload-summary-row">
              <span className="upload-summary-num blue">{report.existingRows.length}</span>
              <span>already in system (will be added to {brand.name} pool with current portal status)</span>
            </div>
          </div>

          {report.existingRows.length > 0 && (
            <div className="upload-section">
              <h4>Already in system — auto-stamped status</h4>
              <ul className="upload-list">
                {report.existingRows.map((d, i) => (
                  <li key={i} className="upload-row">
                    <div>
                      <div className="upload-row-name">{d.existing.name}</div>
                      <div className="muted small">{d.existing.handle}</div>
                    </div>
                    <span className={`pill ${d.portalStatus.color}`}>{d.portalStatus.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.newRows.length > 0 && (
            <div className="upload-section">
              <h4>New creators</h4>
              <ul className="upload-list">
                {report.newRows.map((r, i) => (
                  <li key={i} className="upload-row">
                    <div>
                      <div className="upload-row-name">{r.name ?? r.handle}</div>
                      <div className="muted small">{r.handle} · {r.email ?? '—'}</div>
                    </div>
                    <span className="pill gray">Not in Program</span>
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
