import { useMemo, useState } from 'react';
import { Sparkles, Check, X, Plus } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import { useEventStore } from '../../store/useEventStore.jsx';
import { useToast } from '../../components/Toast.jsx';
import {
  selectBrandPool, selectCreatorCampaigns, selectCreatorStatus,
  scoreBriefFit,
} from '../../domain/selectors.js';
import { EVENT_TYPES as E } from '../../domain/events.js';
import Avatar from '../../components/Avatar.jsx';
import Pill from '../../components/Pill.jsx';

export default function BriefCheckPanel({ campaign, brief, brand, onClose }) {
  const { events, creators, campaigns, appendEvent } = useEventStore();
  const toast = useToast();

  // Find creators currently in this campaign (any non-NONE stage)
  const inCampaign = useMemo(() => {
    const ids = new Set();
    for (const ev of events) {
      if (ev.campaignId === campaign.id) ids.add(ev.creatorId);
    }
    return Array.from(ids)
      .map((id) => creators.find((c) => c.id === id))
      .filter(Boolean);
  }, [events, campaign.id, creators]);

  // Score each creator in the campaign against the brief
  const scored = useMemo(() => {
    return inCampaign
      .map((c) => ({
        creator: c,
        ...scoreBriefFit(c, brief),
      }))
      .sort((a, b) => b.score - a.score);
  }, [inCampaign, brief]);

  const greenCount = scored.filter((s) => s.fit === 'green').length;
  const redCount = scored.filter((s) => s.fit === 'red').length;

  // Replacements: brand pool first (qualified, not in this campaign), then general pool
  const replacements = useMemo(() => {
    const inCampaignIds = new Set(inCampaign.map((c) => c.id));
    // Brand pool — qualified
    const brandPool = selectBrandPool(events, brand.id);
    const qualifiedNotInCampaign = brandPool
      .filter((p) => p.status === 'qualified' && !inCampaignIds.has(p.creatorId))
      .map((p) => creators.find((c) => c.id === p.creatorId))
      .filter(Boolean);
    // Score them
    const fromBrandPool = qualifiedNotInCampaign
      .map((c) => ({
        creator: c,
        source: 'brand-pool',
        ...scoreBriefFit(c, brief),
      }))
      .filter((r) => r.fit === 'green')
      .sort((a, b) => b.score - a.score);

    // General pool — In Portal creators not in brand pool
    const inPool = new Set(brandPool.map((p) => p.creatorId));
    const inProgramOutsidePool = creators.filter((c) => {
      if (inPool.has(c.id)) return false;
      if (inCampaignIds.has(c.id)) return false;
      const status = selectCreatorStatus(events, c.id, campaigns);
      return status.kind === 'IN_PORTAL';
    });
    const fromGeneral = inProgramOutsidePool
      .map((c) => ({
        creator: c,
        source: 'general',
        ...scoreBriefFit(c, brief),
      }))
      .filter((r) => r.fit === 'green')
      .sort((a, b) => b.score - a.score);

    // Top 5 — brand pool first, fill remainder from general
    const topBrand = fromBrandPool.slice(0, 5);
    const remaining = 5 - topBrand.length;
    const topGeneral = remaining > 0 ? fromGeneral.slice(0, remaining) : [];
    return [...topBrand, ...topGeneral];
  }, [events, creators, campaigns, brand.id, inCampaign, brief]);

  function addToCampaign(creator) {
    appendEvent({
      type: E.ASSIGNED_TO_CAMPAIGN,
      creatorId: creator.id,
      campaignId: campaign.id,
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
              <strong>{greenCount}</strong> still fit · <strong>{redCount}</strong> flagged for replacement
            </div>
            <div className="muted small">
              Categories: {brief.categories.join(', ')} · Platforms: {brief.platforms.join(', ')} · {brief.gifted ? 'Gifted' : 'Paid'}
            </div>
          </div>
        </div>

        {/* In-campaign creators with their scores */}
        <h4 style={{ marginTop: 18, marginBottom: 8 }}>In the campaign</h4>
        <ul className="brief-check-list">
          {scored.map(({ creator, fit, score, reasons }) => (
            <li key={creator.id} className={`brief-check-row ${fit}`}>
              <Avatar creator={creator} size={32} />
              <div className="brief-check-row-meta">
                <div className="brief-check-row-name">{creator.name}</div>
                <div className="brief-check-row-handle muted small">{creator.handle}</div>
                <div className="brief-check-row-reasons">
                  {reasons.map((r, i) => <span key={i} className="brief-check-reason">{r}</span>)}
                </div>
              </div>
              <span className={`brief-check-fit ${fit}`}>
                {fit === 'green' ? <><Check size={14} /> fit</> : <><X size={14} /> at risk</>}
                <span className="brief-check-score">{score > 0 ? `+${score}` : score}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Replacements */}
        {redCount > 0 && replacements.length > 0 && (
          <>
            <div className="brief-check-divider" />
            <h4 style={{ marginBottom: 8 }}>Suggested replacements</h4>
            <p className="muted small" style={{ marginBottom: 12 }}>
              Top {replacements.length} from {replacements.filter((r) => r.source === 'brand-pool').length > 0 ? `${brand.name} pool` : 'the general pool'}, ranked by deterministic brief-fit score.
            </p>
            <ul className="brief-check-list">
              {replacements.map(({ creator, score, reasons, source }) => (
                <li key={creator.id} className="brief-check-row green">
                  <Avatar creator={creator} size={32} />
                  <div className="brief-check-row-meta">
                    <div className="brief-check-row-name">
                      {creator.name}
                      <span className="brief-check-source">
                        {source === 'brand-pool' ? `from ${brand.name} pool` : 'from general pool'}
                      </span>
                    </div>
                    <div className="brief-check-row-handle muted small">{creator.handle}</div>
                    <div className="brief-check-row-reasons">
                      {reasons.slice(0, 3).map((r, i) => <span key={i} className="brief-check-reason">{r}</span>)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn primary small"
                    onClick={() => addToCampaign(creator)}
                  >
                    <Plus size={13} /> Add to campaign
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
