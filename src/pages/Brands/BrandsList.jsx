import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, Clock, AlertCircle, AlertTriangle, ListChecks, CircleDot, Hourglass,
} from 'lucide-react';
import { useEventStore } from '../../store/useEventStore.jsx';
import {
  selectBrandPool, selectBrandOperationalState, selectBrandStatus,
  selectCampaignStageCounts, selectCampaignWaitingState,
  selectBrandActionCategory, selectStaleInvitesForCampaign,
} from '../../domain/selectors.js';
import Pill from '../../components/Pill.jsx';
import BrandLogo from './BrandLogo.jsx';

const ONBOARDING_LABEL = {
  'complete': { label: 'Complete', icon: Check, tone: 'green' },
  'in-progress': { label: 'In progress', icon: CircleDot, tone: 'yellow' },
  'not-started': { label: 'Not started', icon: AlertCircle, tone: 'gray' },
};
const CONTRACT_LABEL = {
  'signed': { label: 'Signed', icon: Check, tone: 'green' },
  'unsigned': { label: 'Unsigned', icon: AlertCircle, tone: 'red' },
};
const BILLING_LABEL = {
  'active': { label: 'Active', icon: Check, tone: 'green' },
  'awaiting-first-payment': { label: 'Awaiting first payment', icon: Hourglass, tone: 'yellow' },
  'settled': { label: 'Settled', icon: Check, tone: 'green' },
};

function OperationalRow({ opState }) {
  const items = [
    { label: 'BRAND ONBOARDING', state: ONBOARDING_LABEL[opState.onboarding] },
    { label: 'CONTRACT', state: CONTRACT_LABEL[opState.contract] },
    { label: 'BILLING', state: BILLING_LABEL[opState.billing] },
  ];
  return (
    <div className="brand-op-row">
      {items.map(({ label, state }) => (
        <div key={label} className="brand-op-cell">
          <div className="brand-op-cell-label">{label}</div>
          <div className={`brand-op-cell-value tone-${state.tone}`}>
            <state.icon size={13} />
            <span>{state.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CampaignRow({ campaign, stageCounts, waitingState }) {
  const STATUS = {
    live: { label: 'live', color: 'green' },
    draft: { label: 'draft', color: 'gray' },
    completed: { label: 'completed', color: 'purple' },
  };
  const status = STATUS[campaign.status];

  return (
    <div className="brand-campaign-row">
      <div className="brand-campaign-row-left">
        <span className="brand-campaign-row-name">{campaign.name}</span>
        <Pill color={status.color}>{status.label}</Pill>
        <span className="muted small">{stageCounts.total} loaded</span>
      </div>
      <div className="brand-campaign-row-stages">
        {campaign.status === 'completed' ? (
          <>
            <Stage label="Completed" count={stageCounts.posted} tone="green" />
            {stageCounts.declined > 0 && <Stage label="Declined" count={stageCounts.declined} tone="red" />}
          </>
        ) : (
          <>
            <Stage label="Invited" count={stageCounts.invited} tone="yellow" />
            <Stage label="Accepted" count={stageCounts.accepted} tone="blue" />
            {stageCounts.declined > 0 && <Stage label="Declined" count={stageCounts.declined} tone="red" />}
            <Stage label="Prod Sel." count={stageCounts.productSelected + stageCounts.ordered} tone="blue" />
            <Stage label="Content" count={stageCounts.contentSubmitted} tone="blue" />
            <Stage label="Posted" count={stageCounts.posted} tone="green" />
          </>
        )}
      </div>
      <div className="brand-campaign-row-status">
        <span className={`brand-campaign-waiting tone-${waitingState.color}`}>
          {waitingState.label}
        </span>
      </div>
    </div>
  );
}

function Stage({ label, count, tone }) {
  return (
    <span className={`brand-stage-chip tone-${tone} ${count === 0 ? 'zero' : ''}`}>
      <span className="brand-stage-chip-label">{label}</span>
      <span className="brand-stage-chip-count">{count}</span>
    </span>
  );
}

function BrandCard({ entry }) {
  const {
    brand, opState, status, brandCampaigns, pool, qualified, potential,
    actionCategory, campaignBlocks, additionalAlerts,
  } = entry;

  return (
    <li className={`brand-card-v2 accent-${actionCategory.accent}`}>
      <Link to={`/admin/brands/${brand.id}/pool`} className="brand-card-v2-link">
        <header className="brand-card-v2-head">
          <BrandLogo brand={brand} size={48} />
          <div className="brand-card-v2-titles">
            <div className="brand-card-v2-name-row">
              <span className="brand-card-v2-name">{brand.name}</span>
              <span className="brand-card-v2-handle">{brand.handle}</span>
            </div>
            <div className="brand-card-v2-desc">{brand.description}</div>
          </div>
          <span className={`brand-status-pill tone-${status.color}`}>
            {status.kind === 'onboarding' && <CircleDot size={12} />}
            {status.kind === 'active' && <Check size={12} />}
            {status.kind === 'completed' && <Check size={12} />}
            {status.label}
          </span>
        </header>

        <OperationalRow opState={opState} />

        <div className="brand-pool-stats">
          <div className="brand-pool-stat">
            <span className="brand-pool-stat-num">{pool.length}</span>
            <span className="brand-pool-stat-label">IN POOL</span>
          </div>
          <span className="brand-pool-divider">·</span>
          <div className="brand-pool-stat">
            <span className="brand-pool-stat-num">{qualified}</span>
            <span className="brand-pool-stat-label">QUALIFIED</span>
          </div>
          <span className="brand-pool-divider">·</span>
          <div className="brand-pool-stat">
            <span className="brand-pool-stat-num">{potential}</span>
            <span className="brand-pool-stat-label">POTENTIAL</span>
          </div>
        </div>

        {brandCampaigns.length > 0 && (
          <div className="brand-campaigns-section">
            <div className="brand-section-title">CAMPAIGNS</div>
            {campaignBlocks.map((block) => (
              <div key={block.campaign.id} className="brand-campaign-block">
                <CampaignRow
                  campaign={block.campaign}
                  stageCounts={block.stageCounts}
                  waitingState={block.waitingState}
                />
                {block.staleInvites.map((s) => (
                  <div key={s.creator.id} className="brand-alert-banner warning">
                    <AlertTriangle size={14} />
                    <span>
                      <strong>{s.creator.name}</strong> — Invited {s.days}d ago (stale).
                      Brand needs to select creators.
                    </span>
                  </div>
                ))}
                {block.draftAction && (
                  <div className="brand-alert-banner ops">
                    <ListChecks size={14} />
                    <span>
                      <strong>Ops action:</strong> Load creators from pre-selection into campaign
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {additionalAlerts.map((alert, i) => (
          <div key={i} className="brand-alert-banner warning">
            <AlertTriangle size={14} />
            <span>{alert}</span>
          </div>
        ))}
      </Link>
    </li>
  );
}

export default function BrandsList() {
  const { brands, events, campaigns, creators } = useEventStore();

  const enriched = useMemo(() => brands.map((brand) => {
    const opState = selectBrandOperationalState(brand, events);
    const pool = selectBrandPool(events, brand.id);
    const qualified = pool.filter((p) => p.status === 'qualified').length;
    const potential = pool.filter((p) => p.status === 'potential').length;
    const brandCampaigns = campaigns.filter((c) => c.brandHandle === brand.handle);
    const status = selectBrandStatus(brand, opState, brandCampaigns);

    // Per-campaign blocks
    const campaignBlocks = brandCampaigns.map((c) => {
      const stageCounts = selectCampaignStageCounts(events, c.id, campaigns);
      const waitingState = selectCampaignWaitingState(stageCounts, c, opState);
      const staleInvites = c.status === 'live'
        ? selectStaleInvitesForCampaign(events, c.id, campaigns, creators)
        : [];
      const draftAction = c.status === 'draft' && stageCounts.total === 0
        && opState.onboarding === 'complete' && opState.billing !== 'awaiting-first-payment';
      return { campaign: c, stageCounts, waitingState, staleInvites, draftAction };
    });

    const actionCategory = selectBrandActionCategory(
      brand, opState, brandCampaigns, pool, events, creators, campaigns,
    );

    // Additional brand-level alerts (not campaign-specific)
    const additionalAlerts = [];
    if (opState.onboarding !== 'complete' || opState.billing === 'awaiting-first-payment') {
      additionalAlerts.push("Brand hasn't completed onboarding or paid first invoice. Follow up.");
    }

    return {
      brand, opState, status, brandCampaigns, pool, qualified, potential,
      actionCategory, campaignBlocks, additionalAlerts,
    };
  }), [brands, events, campaigns, creators]);

  const needsAction = enriched.filter((e) => e.actionCategory.category === 'needs-action');
  const onTrack = enriched.filter((e) => e.actionCategory.category === 'on-track');

  return (
    <div className="brands-list-page">
      <header className="brands-list-header-v2">
        <h1>Brands</h1>
        <span className="muted">
          {enriched.length} brands · {needsAction.length} need action · {onTrack.length} on track
        </span>
      </header>

      <div className="brands-legend">
        <span className="brands-legend-item"><span className="dot tone-orange" /> Needs action</span>
        <span className="brands-legend-item"><span className="dot tone-green" /> On track</span>
        <span className="brands-legend-item"><span className="dot tone-blue" /> Waiting on us</span>
      </div>

      {needsAction.length > 0 && (
        <section className="brands-section-v2">
          <h2 className="brands-section-title-v2">
            <AlertTriangle size={14} /> NEEDS ACTION
          </h2>
          <ul className="brands-list-v2">
            {needsAction.map((e) => <BrandCard key={e.brand.id} entry={e} />)}
          </ul>
        </section>
      )}

      {onTrack.length > 0 && (
        <section className="brands-section-v2">
          <h2 className="brands-section-title-v2">
            <Check size={14} /> ON TRACK
          </h2>
          <ul className="brands-list-v2">
            {onTrack.map((e) => <BrandCard key={e.brand.id} entry={e} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
