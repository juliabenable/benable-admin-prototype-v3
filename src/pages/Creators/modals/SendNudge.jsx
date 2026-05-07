import { useEffect, useMemo, useState } from 'react';
import Modal from '../../../components/Modal.jsx';
import { useEventStore } from '../../../store/useEventStore.jsx';
import { useToast } from '../../../components/Toast.jsx';
import { selectCreatorCampaigns } from '../../../domain/selectors.js';
import { EVENT_TYPES as E } from '../../../domain/events.js';

function pickStageCodeFromStatus(status) {
  if (!status) return 'INVITED';
  if (status.kind === 'IN_PORTAL') return 'IN_PORTAL';
  if (status.kind === 'INVITED') return 'INVITED';
  if (status.kind === 'IN_CAMPAIGN') return 'ASSIGNED';
  return 'INVITED';
}

export default function SendNudge({ creator, status, onClose }) {
  const { events, campaigns, nudgeTemplates, appendEvent } = useEventStore();
  const toast = useToast();

  const liveCampaigns = useMemo(() =>
    selectCreatorCampaigns(events, creator.id, campaigns).filter((c) => c.campaign.status === 'live'),
    [events, creator.id, campaigns],
  );

  const initialStageCode = pickStageCodeFromStatus(status);
  const initialTemplate = nudgeTemplates.find((t) => t.appliesTo.includes(initialStageCode))
    ?? nudgeTemplates[0];

  const [templateId, setTemplateId] = useState(initialTemplate?.id ?? '');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState('email'); // default per PRD Open Q5
  const [campaignId, setCampaignId] = useState(liveCampaigns[0]?.campaign.id ?? '');

  // Recompute template body whenever the user changes template or campaign
  useEffect(() => {
    const tpl = nudgeTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    const camp = campaigns.find((c) => c.id === campaignId);
    setBody(tpl.body(creator, camp));
  }, [templateId, campaignId, creator, campaigns, nudgeTemplates]);

  function send() {
    const tpl = nudgeTemplates.find((t) => t.id === templateId);
    appendEvent({
      type: E.NUDGE_SENT,
      creatorId: creator.id,
      campaignId: campaignId || null,
      actor: { kind: 'ops', name: 'Julia' },
      payload: {
        templateId,
        templateLabel: tpl?.label,
        channel,
        subject: tpl?.subject,
        body,
      },
    });
    toast(`Nudge sent to ${creator.name} via ${channel}`);
    onClose?.();
  }

  return (
    <Modal
      title={`Send nudge to ${creator.name}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn primary" onClick={send} disabled={!body.trim()}>
            Send via {channel}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="row gap-3" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="muted micro" style={{ display: 'block', marginBottom: 4 }}>Template</label>
            <select
              className="select"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {nudgeTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 140 }}>
            <label className="muted micro" style={{ display: 'block', marginBottom: 4 }}>Send via</label>
            <select className="select" value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>
        </div>

        {liveCampaigns.length > 0 && (
          <div>
            <label className="muted micro" style={{ display: 'block', marginBottom: 4 }}>About campaign (optional)</label>
            <select className="select" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              <option value="">— None —</option>
              {liveCampaigns.map((c) => (
                <option key={c.campaign.id} value={c.campaign.id}>
                  {c.campaign.brandHandle} · {c.campaign.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="muted micro" style={{ display: 'block', marginBottom: 4 }}>Message</label>
          <textarea
            className="textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={9}
          />
          <p className="muted small" style={{ marginTop: 4 }}>
            Editable. Logged in the Activity tab when sent.
          </p>
        </div>
      </div>
    </Modal>
  );
}
