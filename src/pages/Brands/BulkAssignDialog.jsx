import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import { useEventStore } from '../../store/useEventStore.jsx';
import { useToast } from '../../components/Toast.jsx';
import { selectCreatorCampaigns } from '../../domain/selectors.js';
import { EVENT_TYPES as E } from '../../domain/events.js';

export default function BulkAssignDialog({ brand, creators, onClose, onAssigned }) {
  const { campaigns, campaignTemplates, events, appendEvent } = useEventStore();
  const toast = useToast();

  const eligibleCampaigns = campaigns.filter((c) =>
    c.brandHandle === brand.handle && (c.status === 'live' || c.status === 'draft'),
  );

  const [mode, setMode] = useState('campaign'); // 'campaign' | 'template'
  const [campaignId, setCampaignId] = useState(eligibleCampaigns[0]?.id ?? '');
  const [templateId, setTemplateId] = useState(campaignTemplates[0]?.id ?? '');

  // Skip creators already in the chosen campaign
  const alreadyAssigned = useMemo(() => {
    const set = new Set();
    if (mode !== 'campaign' || !campaignId) return set;
    for (const c of creators) {
      const has = selectCreatorCampaigns(events, c.id, campaigns)
        .some((x) => x.campaign.id === campaignId);
      if (has) set.add(c.id);
    }
    return set;
  }, [mode, campaignId, creators, events, campaigns]);

  function submit() {
    let added = 0;
    if (mode === 'campaign') {
      if (!campaignId) return;
      const camp = campaigns.find((c) => c.id === campaignId);
      for (const c of creators) {
        if (alreadyAssigned.has(c.id)) continue;
        appendEvent({
          type: E.ASSIGNED_TO_CAMPAIGN,
          creatorId: c.id, campaignId,
          actor: { kind: 'ops', name: 'Julia' },
          payload: { source: 'bulk-pool-assign' },
        });
        added += 1;
      }
      toast(`Assigned ${added} creator${added === 1 ? '' : 's'} to ${camp?.name}`);
    } else {
      if (!templateId) return;
      const tpl = campaignTemplates.find((t) => t.id === templateId);
      for (const c of creators) {
        appendEvent({
          type: E.ASSIGNED_TO_CAMPAIGN,
          creatorId: c.id, campaignId: null,
          actor: { kind: 'ops', name: 'Julia' },
          payload: { templateId, templateName: tpl?.name, source: 'bulk-template-assign' },
        });
        added += 1;
      }
      toast(`Assigned ${added} creator${added === 1 ? '' : 's'} to template "${tpl?.name}"`);
    }
    onAssigned?.(added);
  }

  const skipping = alreadyAssigned.size;

  return (
    <Modal
      title={`Assign ${creators.length} creator${creators.length === 1 ? '' : 's'} to a campaign`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn primary"
            onClick={submit}
            disabled={mode === 'campaign' ? !campaignId : !templateId}
          >
            <Plus size={14} /> Assign {creators.length - skipping}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="segmented">
          <button
            type="button"
            className={`segmented-option ${mode === 'campaign' ? 'active' : ''}`}
            onClick={() => setMode('campaign')}
          >
            {brand.name} campaign
          </button>
          <button
            type="button"
            className={`segmented-option ${mode === 'template' ? 'active' : ''}`}
            onClick={() => setMode('template')}
          >
            Campaign template
          </button>
        </div>

        {mode === 'campaign' ? (
          <div>
            <label className="muted micro" style={{ display: 'block', marginBottom: 6 }}>Campaign</label>
            <select
              className="select"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              {eligibleCampaigns.length === 0 && <option value="">No live or draft campaigns for this brand</option>}
              {eligibleCampaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.status === 'draft' ? '  (draft)' : ''}
                </option>
              ))}
            </select>
            {skipping > 0 && (
              <p className="muted small" style={{ marginTop: 6 }}>
                Skipping {skipping} creator{skipping === 1 ? '' : 's'} already assigned to this campaign.
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="muted micro" style={{ display: 'block', marginBottom: 6 }}>Template</label>
            <select
              className="select"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {campaignTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
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
