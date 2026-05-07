import { useMemo } from 'react';
import { Sparkles, Plus, AlertTriangle, AlertCircle } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import { useEventStore } from '../../store/useEventStore.jsx';
import { useToast } from '../../components/Toast.jsx';
import {
  selectBrandPool, selectCreatorCampaigns, selectCreatorStatus,
  scoreBriefFit,
} from '../../domain/selectors.js';
import { CAMPAIGN_TO_BRAND } from '../../domain/seed/brands.js';
import { EVENT_TYPES as E } from '../../domain/events.js';
import Avatar from '../../components/Avatar.jsx';

const BUCKET_LABEL = { high: 'High fit', medium: 'Medium fit', low: 'Low fit' };
const BUCKET_TONE = { high: 'green', medium: 'yellow', low: 'red' };

function FitBar({ fit, bucket }) {
  const pct = Math.max(2, Math.min(100, (fit / 10) * 100));
  return (
    <div className="fit-bar-wrap" title={`${fit.toFixed(1)} / 10`}>
      <div className="fit-bar-track">
        <div className={`fit-bar-fill tone-${BUCKET_TONE[bucket]}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`fit-bar-label tone-${BUCKET_TONE[bucket]}`}>
        {BUCKET_LABEL[bucket]} · {fit.toFixed(1)}
      </span>
    </div>
  );
}

// Determine if creator has previously declined this brand
function pastDeclineForBrand(events, creatorId, brandId, campaigns) {
  const declines = events.filter((e) =>
    e.creatorId === creatorId && e.type === E.CAMPAIGN_DECLINED,
  );
  for (const d of declines) {
    const campId = d.campaignId;
    if (campId && CAMPAIGN_TO_BRAND[campId] === brandId) {
      const camp = campaigns.find((c) => c.id === campId);
      return { reason: d.payload?.reason, campaign: camp, timestamp: d.timestamp };
    }
  }
  return null;
}

export default function BriefCheckPanel({ campaign, brief, brand, onClose }) {
  const { events, creators, campaigns, appendEvent } = useEventStore();
  const toast = useToast();

  // Find creators currently in this campaign
  const inCampaign = useMemo(() => {
    const ids = new Set();
    for (const ev of events) {
      if (ev.campaignId === campaign.id) ids.add(ev.creatorId);
    }
    return Array.from(ids).map((id) => creators.find((c) => c.id === id)).filter(Boolean);
  }, [events, campaign.id, creators]);

  // Score in-campaign creators with past-decline context
  const scored = useMemo(() => {
    return inCampaign.map((c) => {
      const pastDecline = pastDeclineForBrand(events, c.id, brand.id, campaigns);
      return {
        creator: c,
        pastDecline,
        ...scoreBriefFit(c, brief, { hasPastDeclineForThisBrand: !!pastDecline }),
      };
    }).sort((a, b) => b.fit - a.fit);
  }, [inCampaign, brief, events, brand.id, campaigns]);

  const highCount = scored.filter((s) => s.bucket === 'high').length;
  const mediumCount = scored.filter((s) => s.bucket === 'medium').length;
  const lowCount = scored.filter((s) => s.bucket === 'low').length;

  // Replacements: brand pool first (qualified, not in this campaign), then general pool
  const replacements = useMemo(() => {
    const inCampaignIds = new Set(inCampaign.map((c) => c.id));
    const brandPool = selectBrandPool(events, brand.id);
    const qualifiedNotInCampaign = brandPool
      .filter((p) => p.status === 'qualified' && !inCampaignIds.has(p.creatorId))
      .map((p) => creators.find((c) => c.id === p.creatorId))
      .filter(Boolean);
    const fromBrandPool = qualifiedNotInCampaign
      .map((c) => {
        const pd = pastDeclineForBrand(events, c.id, brand.id, campaigns);
        return {
          creator: c, source: 'brand-pool', pastDecline: pd,
          ...scoreBriefFit(c, brief, { hasPastDeclineForThisBrand: !!pd }),
        };
      })
      .filter((r) => r.bucket !== 'low')
      .sort((a, b) => b.fit - a.fit);

    const inPool = new Set(brandPool.map((p) => p.creatorId));
    const inProgramOutsidePool = creators.filter((c) => {
      if (inPool.has(c.id)) return false;
      if (inCampaignIds.has(c.id)) return false;
      const status = selectCreatorStatus(events, c.id, campaigns);
      return status.kind === 'IN_PORTAL';
    });
    const fromGeneral = inProgramOutsidePool
      .map((c) => {
        const pd = pastDeclineForBrand(events, c.id, brand.id, campaigns);
        return {
          creator: c, source: 'general', pastDecline: pd,
          ...scoreBriefFit(c, brief, { hasPastDeclineForThisBrand: !!pd }),
        };
      })
      .filter((r) => r.bucket !== 'low')
      .sort((a, b) => b.fit - a.fit);

    const topBrand = fromBrandPool.slice(0, 5);
    const remaining = 5 - topBrand.length;
    const topGeneral = remaining > 0 ? fromGeneral.slice(0, remaining) : [];
    return [...topBrand, ...topGeneral];
  }, [events, creators, campaigns, brand.id, inCampaign, brief]);

  function addToCampaign(creator) {
    appendEvent({
      type: E.ASSIGNED_TO_CAMPAIGN,
      creatorId: creator.id, campaignId: campaign.id,
      actor: { kind: 'ops', name: 'Julia' },
      payload: { source: 'brief-check-replacement' },
    });
    toast(`Added ${creator.name} to ${campaign.name}`);
  }

  return (
    <Modal
      title={`Brief check · ${campaign.name}`}
      onClose={onClose}
      wide
      footer={<button type="button" className="btn primary" onClick={onClose}>Close</button>}
    >
      <div className="brief-check">
        <div className="brief-check-meta">
          <Sparkles size={16} className="brief-check-icon" />
          <div>
            <div className="brief-check-summary">
              <strong>{highCount}</strong> high fit · <strong>{mediumCount}</strong> medium · <strong>{lowCount}</strong> low
            </div>
            <div className="muted small">
              Categories: {brief.categories.join(', ')} · Platforms: {brief.platforms.join(', ')} · {brief.gifted ? 'Gifted' : 'Paid'}
            </div>
          </div>
        </div>

        <h4 style={{ marginTop: 18, marginBottom: 8 }}>In the campaign</h4>
        <ul className="brief-check-list">
          {scored.map(({ creator, fit, bucket, reasons, breakdown, pastDecline, incompleteOnboarding }) => (
            <li key={creator.id} className={`brief-check-row tone-${BUCKET_TONE[bucket]}`}>
              <Avatar creator={creator} size={32} />
              <div className="brief-check-row-meta">
                <div className="brief-check-row-name">
                  {creator.name}
                  {pastDecline && (
                    <span className="past-decline-flag" title={`Declined ${pastDecline.campaign?.name}: ${pastDecline.reason}`}>
                      <AlertCircle size={11} /> Past decline
                    </span>
                  )}
                  {incompleteOnboarding && (
                    <span className="incomplete-flag" title="Onboarding gifted/small-brand questions unanswered">
                      <AlertTriangle size={11} /> Incomplete
                    </span>
                  )}
                </div>
                <div className="brief-check-row-handle muted small">{creator.handle}</div>
                <FitBar fit={fit} bucket={bucket} />
                <div className="brief-check-row-reasons">
                  {reasons.slice(0, 4).map((r, i) => <span key={i} className="brief-check-reason">{r}</span>)}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {lowCount > 0 && replacements.length > 0 && (
          <>
            <div className="brief-check-divider" />
            <h4 style={{ marginBottom: 8 }}>Suggested replacements</h4>
            <p className="muted small" style={{ marginBottom: 12 }}>
              Top {replacements.length} from {replacements.filter((r) => r.source === 'brand-pool').length > 0 ? `${brand.name} pool` : 'the general pool'}, ranked by Fit Score.
            </p>
            <ul className="brief-check-list">
              {replacements.map(({ creator, fit, bucket, reasons, source, pastDecline }) => (
                <li key={creator.id} className={`brief-check-row tone-${BUCKET_TONE[bucket]}`}>
                  <Avatar creator={creator} size={32} />
                  <div className="brief-check-row-meta">
                    <div className="brief-check-row-name">
                      {creator.name}
                      <span className="brief-check-source">
                        {source === 'brand-pool' ? `from ${brand.name} pool` : 'from general pool'}
                      </span>
                      {pastDecline && (
                        <span className="past-decline-flag" title={`Declined ${pastDecline.campaign?.name}: ${pastDecline.reason}`}>
                          <AlertCircle size={11} /> Past decline
                        </span>
                      )}
                    </div>
                    <div className="brief-check-row-handle muted small">{creator.handle}</div>
                    <FitBar fit={fit} bucket={bucket} />
                    <div className="brief-check-row-reasons">
                      {reasons.slice(0, 3).map((r, i) => <span key={i} className="brief-check-reason">{r}</span>)}
                    </div>
                  </div>
                  <button type="button" className="btn primary small" onClick={() => addToCampaign(creator)}>
                    <Plus size={13} /> Add
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Modal>
  );
}
