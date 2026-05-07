import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import { useEventStore } from '../../store/useEventStore.jsx';
import { useToast } from '../../components/Toast.jsx';
import { selectCreatorCampaigns } from '../../domain/selectors.js';
import { EVENT_TYPES as E } from '../../domain/events.js';

/**
 * Bulk-assign dialog with TWO tabs (per Katie spec May 7):
 *   1. "[Brand Name]" — this brand's campaigns + templates merged in one dropdown
 *   2. "Other" — every other brand's campaigns + templates
 *
 * Selection model: a single string value formatted "campaign:<id>" or
 * "template:<id>"; the submit handler decides what event payload to fire.
 */
export default function BulkAssignDialog({ brand, creators, onClose, onAssigned }) {
  const { brands, campaigns, campaignTemplates, events, appendEvent } = useEventStore();
  const toast = useToast();

  // ── Group options per tab ──
  const thisBrandCampaigns = campaigns.filter((c) =>
    c.brandHandle === brand.handle && (c.status === 'live' || c.status === 'draft'),
  );
  const otherBrandCampaigns = campaigns.filter((c) =>
    c.brandHandle !== brand.handle && (c.status === 'live' || c.status === 'draft'),
  );

  const [tab, setTab] = useState('this'); // 'this' | 'other'
  // Default: first option from the active tab
  const initialValue = thisBrandCampaigns[0]
    ? `campaign:${thisBrandCampaigns[0].id}`
    : (campaignTemplates[0] ? `template:${campaignTemplates[0].id}` : '');
  const [selection, setSelection] = useState(initialValue);

  // When the user switches tabs, default to first option in that tab
  function switchTab(t) {
    setTab(t);
    if (t === 'this') {
      setSelection(thisBrandCampaigns[0]
        ? `campaign:${thisBrandCampaigns[0].id}`
        : (campaignTemplates[0] ? `template:${campaignTemplates[0].id}` : ''));
    } else {
      setSelection(otherBrandCampaigns[0]
        ? `campaign:${otherBrandCampaigns[0].id}`
        : '');
    }
  }

  // Already-assigned set (only relevant when the chosen value is a campaign)
  const alreadyAssigned = useMemo(() => {
    const set = new Set();
    if (!selection.startsWith('campaign:')) return set;
    const campaignId = selection.split(':')[1];
    for (const c of creators) {
      const has = selectCreatorCampaigns(events, c.id, campaigns)
        .some((x) => x.campaign.id === campaignId);
      if (has) set.add(c.id);
    }
    return set;
  }, [selection, creators, events, campaigns]);

  function submit() {
    if (!selection) return;
    const [kind, id] = selection.split(':');
    let added = 0;

    if (kind === 'campaign') {
      const camp = campaigns.find((c) => c.id === id);
      for (const c of creators) {
        if (alreadyAssigned.has(c.id)) continue;
        appendEvent({
          type: E.ASSIGNED_TO_CAMPAIGN,
          creatorId: c.id, campaignId: id,
          actor: { kind: 'ops', name: 'Julia' },
          payload: { source: 'bulk-pool-assign' },
        });
        added += 1;
      }
      toast(`Assigned ${added} creator${added === 1 ? '' : 's'} to ${camp?.name ?? 'campaign'}`);
    } else if (kind === 'template') {
      const tpl = campaignTemplates.find((t) => t.id === id);
      for (const c of creators) {
        appendEvent({
          type: E.ASSIGNED_TO_CAMPAIGN,
          creatorId: c.id, campaignId: null,
          actor: { kind: 'ops', name: 'Julia' },
          payload: {
            templateId: id, templateName: tpl?.name,
            source: 'bulk-template-assign',
            // Tag with which brand this template assignment is for
            forBrandId: tab === 'this' ? brand.id : null,
          },
        });
        added += 1;
      }
      toast(`Assigned ${added} creator${added === 1 ? '' : 's'} to template "${tpl?.name}"`);
    }
    onAssigned?.(added);
  }

  // Build a brandId → name map for the "Other" tab labels
  const brandsById = useMemo(() => {
    const m = new Map();
    for (const b of brands) m.set(b.handle, b);
    return m;
  }, [brands]);

  const skipping = alreadyAssigned.size;

  return (
    <Modal
      title={`Assign ${creators.length} creator${creators.length === 1 ? '' : 's'}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn primary"
            onClick={submit}
            disabled={!selection}
          >
            <Plus size={14} /> Assign {creators.length - skipping}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="bulk-assign-tabs">
          <button
            type="button"
            className={`bulk-assign-tab ${tab === 'this' ? 'active' : ''}`}
            onClick={() => switchTab('this')}
          >
            {brand.name}
          </button>
          <button
            type="button"
            className={`bulk-assign-tab ${tab === 'other' ? 'active' : ''}`}
            onClick={() => switchTab('other')}
          >
            Other
          </button>
        </div>

        {tab === 'this' && (
          <div>
            <label className="muted micro" style={{ display: 'block', marginBottom: 6 }}>
              Pick a {brand.name} campaign or template
            </label>
            <select
              className="select"
              value={selection}
              onChange={(e) => setSelection(e.target.value)}
            >
              {thisBrandCampaigns.length > 0 && (
                <optgroup label={`${brand.name} campaigns`}>
                  {thisBrandCampaigns.map((c) => (
                    <option key={c.id} value={`campaign:${c.id}`}>
                      {c.name}{c.status === 'draft' ? '  (draft)' : '  (live)'}
                    </option>
                  ))}
                </optgroup>
              )}
              {campaignTemplates.length > 0 && (
                <optgroup label="Templates">
                  {campaignTemplates.map((t) => (
                    <option key={t.id} value={`template:${t.id}`}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {skipping > 0 && (
              <p className="muted small" style={{ marginTop: 6 }}>
                Skipping {skipping} creator{skipping === 1 ? '' : 's'} already assigned.
              </p>
            )}
            <p className="muted small" style={{ marginTop: 6 }}>
              Creators stay in the {brand.name} pool — assigning is additive, not a move.
            </p>
          </div>
        )}

        {tab === 'other' && (
          <div>
            <label className="muted micro" style={{ display: 'block', marginBottom: 6 }}>
              Pick a campaign from another brand or a template
            </label>
            <select
              className="select"
              value={selection}
              onChange={(e) => setSelection(e.target.value)}
            >
              {otherBrandCampaigns.length === 0 && campaignTemplates.length === 0 && (
                <option value="">No other campaigns or templates available</option>
              )}
              {otherBrandCampaigns.length > 0 && (
                <optgroup label="Other brand campaigns">
                  {otherBrandCampaigns.map((c) => {
                    const b = brandsById.get(c.brandHandle);
                    return (
                      <option key={c.id} value={`campaign:${c.id}`}>
                        {b?.name ?? c.brandName} · {c.name}{c.status === 'draft' ? '  (draft)' : ''}
                      </option>
                    );
                  })}
                </optgroup>
              )}
              {campaignTemplates.length > 0 && (
                <optgroup label="Templates">
                  {campaignTemplates.map((t) => (
                    <option key={t.id} value={`template:${t.id}`}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {skipping > 0 && (
              <p className="muted small" style={{ marginTop: 6 }}>
                Skipping {skipping} creator{skipping === 1 ? '' : 's'} already assigned.
              </p>
            )}
            <p className="muted small" style={{ marginTop: 6 }}>
              Creators stay in the {brand.name} pool — they're being assigned to another brand's work, not removed from this one.
            </p>
          </div>
        )}

        <details className="bulk-assign-list">
          <summary className="muted small">Selected creators ({creators.length})</summary>
          <ul>
            {creators.map((c) => (
              <li key={c.id}>{c.name} <span className="muted small">{c.handle}</span></li>
            ))}
          </ul>
        </details>
      </div>
    </Modal>
  );
}
