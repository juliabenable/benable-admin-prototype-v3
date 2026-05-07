import { useMemo, useState } from 'react';
import Modal from '../../../components/Modal.jsx';
import { useEventStore } from '../../../store/useEventStore.jsx';
import { useToast } from '../../../components/Toast.jsx';
import { selectCreatorCampaigns } from '../../../domain/selectors.js';
import { EVENT_TYPES as E } from '../../../domain/events.js';

export default function AssignToCampaign({ creator, onClose }) {
  const { campaigns, campaignTemplates, events, appendEvent } = useEventStore();
  const toast = useToast();

  const existing = useMemo(
    () => new Set(selectCreatorCampaigns(events, creator.id, campaigns).map((c) => c.campaign.id)),
    [events, creator.id, campaigns],
  );

  const eligibleCampaigns = campaigns.filter((c) => c.status === 'live' || c.status === 'draft');

  const [mode, setMode] = useState('campaign'); // 'campaign' | 'template'
  const [campaignId, setCampaignId] = useState(
    eligibleCampaigns.find((c) => !existing.has(c.id))?.id ?? '',
  );
  const [templateId, setTemplateId] = useState(campaignTemplates[0]?.id ?? '');

  function submit() {
    if (mode === 'campaign') {
      if (!campaignId) return;
      appendEvent({
        type: E.ASSIGNED_TO_CAMPAIGN,
        creatorId: creator.id,
        campaignId,
        actor: { kind: 'ops', name: 'Julia' },
      });
      const camp = campaigns.find((c) => c.id === campaignId);
      toast(`Assigned ${creator.name} to ${camp?.name}`);
    } else {
      if (!templateId) return;
      const tpl = campaignTemplates.find((t) => t.id === templateId);
      appendEvent({
        type: E.ASSIGNED_TO_CAMPAIGN,
        creatorId: creator.id,
        campaignId: null,
        actor: { kind: 'ops', name: 'Julia' },
        payload: { templateId, templateName: tpl?.name },
      });
      toast(`Assigned ${creator.name} to ${tpl?.name}`);
    }
    onClose?.();
  }

  const canSubmit = mode === 'campaign' ? !!campaignId : !!templateId;

  return (
    <Modal
      title={`Assign ${creator.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn primary" onClick={submit} disabled={!canSubmit}>
            Assign
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
            Specific campaign
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
              {eligibleCampaigns.length === 0 && <option value="">No active or draft campaigns</option>}
              {eligibleCampaigns.map((c) => (
                <option key={c.id} value={c.id} disabled={existing.has(c.id)}>
                  {c.brandHandle} · {c.name}
                  {existing.has(c.id) ? '  (already assigned)' : c.status === 'draft' ? '  (draft)' : ''}
                </option>
              ))}
            </select>
            <p className="muted small" style={{ marginTop: 6 }}>
              Adds {creator.name} to this campaign's pre-selection.
            </p>
          </div>
        ) : (
          <div>
            <label className="muted micro" style={{ display: 'block', marginBottom: 6 }}>Template</label>
            <select
              className="select"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {campaignTemplates.length === 0 && <option value="">No templates available</option>}
              {campaignTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {templateId && (
              <p className="muted small" style={{ marginTop: 6 }}>
                {campaignTemplates.find((t) => t.id === templateId)?.description}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
