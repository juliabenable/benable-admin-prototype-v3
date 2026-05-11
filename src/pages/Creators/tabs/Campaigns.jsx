import { useMemo, useState } from 'react';
import { Plus, ChevronDown, Check, X as XIcon, Clock, HelpCircle, AlertTriangle } from 'lucide-react';
import { useEventStore } from '../../../store/useEventStore.jsx';
import {
  selectCreatorCampaigns, selectCreatorBrandPools, TODAY_ISO,
  OFFICIAL_STAGES,
} from '../../../domain/selectors.js';
import { useToast } from '../../../components/Toast.jsx';
import Pill from '../../../components/Pill.jsx';
import BrandLogo from '../../Brands/BrandLogo.jsx';
import { EVENT_TYPES as E } from '../../../domain/events.js';

// Per Katie spec May 7: only show LIVE campaigns + the 4 decision states.
// Decision = (brand accepted? × creator accepted?) — four mutually exclusive
// outcomes with a single combined indicator.

const SIMULATE_OPTIONS = [
  { type: E.BRAND_INVITED, label: 'Brand invited' },
  { type: E.BRAND_ACCEPTED, label: 'Brand accepted' },
  { type: E.BRAND_REJECTED, label: 'Brand rejected' },
  { type: E.BRAND_NO_RESPONSE, label: 'Brand: no response' },
  { type: E.PRODUCT_SHIPPED, label: 'Product shipped' },
];

function stageAgeDays(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.parse(TODAY_ISO) - Date.parse(iso)) / 86400000));
}

function stageAgeTone(days) {
  // Traffic light per Katie May 8: clear "what needs attention".
  if (days >= 14) return 'red';
  if (days >= 7) return 'yellow';
  return 'gray';
}

function compactAge(iso) {
  if (!iso) return '';
  const days = stageAgeDays(iso);
  if (days === 0) return 'today';
  return `${days}d`;
}

// Derive creator decision from stage:
//   ACCEPTED-onward stages → creator accepted
//   DECLINED stage         → creator declined
//   ASSIGNED / VIEWED      → pending
function creatorDecision(stage) {
  if (stage === 'DECLINED') return 'declined';
  if (stage === 'ASSIGNED' || stage === 'DETAILS_VIEWED' || stage === 'BRIEF_SCROLLED') return 'pending';
  return 'accepted';
}

function brandDecisionKind(brandDecision) {
  if (brandDecision === 'ACCEPTED') return 'accepted';
  if (brandDecision === 'REJECTED') return 'rejected';
  if (brandDecision === 'NO_RESPONSE') return 'no-response';
  if (brandDecision === 'INVITED') return 'pending';
  return 'pending'; // null / not yet
}

const DECISION_BADGE = {
  accepted: { label: 'Accepted', color: 'green', Icon: Check },
  declined: { label: 'Declined', color: 'red', Icon: XIcon },
  rejected: { label: 'Rejected', color: 'red', Icon: XIcon },
  pending: { label: 'Pending', color: 'yellow', Icon: Clock },
  'no-response': { label: 'No response', color: 'gray', Icon: HelpCircle },
};

function DecisionBadge({ kind }) {
  const meta = DECISION_BADGE[kind] ?? DECISION_BADGE.pending;
  const { Icon } = meta;
  return (
    <span className={`decision-badge tone-${meta.color}`}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}

export default function CampaignsTab({ creator, onOpenAssign }) {
  const { events, campaigns, brands, appendEvent } = useEventStore();
  const toast = useToast();

  const allCampaigns = useMemo(
    () => selectCreatorCampaigns(events, creator.id, campaigns),
    [events, creator.id, campaigns],
  );

  // Only LIVE campaigns per Katie May 7
  const liveCampaigns = useMemo(
    () => allCampaigns.filter((c) => c.campaign.status === 'live'),
    [allCampaigns],
  );

  const pools = useMemo(
    () => selectCreatorBrandPools(events, creator.id, brands),
    [events, creator.id, brands],
  );

  const [openMenu, setOpenMenu] = useState(null);
  // Stage filter at top of tab — 'all' or one of the 10 official stage ids
  const [stageFilter, setStageFilter] = useState('all');

  // Count live campaigns per official stage for filter chip badges
  const stageCounts = useMemo(() => {
    const counts = { all: liveCampaigns.length };
    for (const c of liveCampaigns) {
      const id = c.officialStageId ?? 'invited';
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }, [liveCampaigns]);

  const filteredCampaigns = useMemo(() => {
    if (stageFilter === 'all') return liveCampaigns;
    return liveCampaigns.filter((c) => c.officialStageId === stageFilter);
  }, [liveCampaigns, stageFilter]);

  const declineReasons = useMemo(() => {
    const m = new Map();
    for (const e of events) {
      if (e.creatorId !== creator.id) continue;
      if (e.type === E.CAMPAIGN_DECLINED && e.payload?.reason) {
        m.set(e.campaignId, e.payload.reason);
      }
    }
    return m;
  }, [events, creator.id]);

  function fireBrandAction(campaignId, type) {
    appendEvent({
      type,
      creatorId: creator.id,
      campaignId,
      actor: { kind: 'brand' },
    });
    setOpenMenu(null);
    toast('Brand action simulated');
  }

  return (
    <div className="campaigns-tab">
      <div className="campaigns-header">
        <h3>Live campaigns ({liveCampaigns.length})</h3>
        <button type="button" className="btn primary small" onClick={onOpenAssign}>
          <Plus size={14} /> Assign to New Campaign
        </button>
      </div>

      {/* ─── Stage filter strip (Katie May 8) ─── */}
      {liveCampaigns.length > 0 && (
        <div className="stage-filter-strip">
          <button
            type="button"
            className={`stage-chip stage-filter-chip all ${stageFilter === 'all' ? 'active' : ''}`}
            data-count={stageCounts.all}
            onClick={() => setStageFilter('all')}
          >
            All <span className="stage-filter-count">({stageCounts.all})</span>
          </button>
          {OFFICIAL_STAGES.map((s) => {
            const count = stageCounts[s.id] ?? 0;
            return (
              <button
                key={s.id}
                type="button"
                className={`stage-chip stage-filter-chip color-${s.color} ${stageFilter === s.id ? 'active' : ''}`}
                data-count={count}
                onClick={() => setStageFilter(s.id)}
              >
                {s.label} <span className="stage-filter-count">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {liveCampaigns.length === 0 ? (
        <div className="tab-empty">Not in any live campaigns. Use "Assign to New Campaign" to add this creator.</div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="tab-empty">No live campaigns in this stage.</div>
      ) : (
        <ul className="campaign-card-list">
          {filteredCampaigns.map((c) => {
            const cDec = creatorDecision(c.stage);
            const bDec = brandDecisionKind(c.brandDecision);
            const menuKey = c.campaign.id;
            const ageDays = stageAgeDays(c.lastUpdate);
            const ageTone = stageAgeTone(ageDays);
            const stalled = ageDays >= 7;
            const stage = c.officialStage ?? { id: 'invited', label: 'Invited', color: 'yellow' };
            return (
              <li key={c.campaign.id} className={`campaign-card ${stalled ? `stalled-${ageTone}` : ''}`}>
                <div className="campaign-card-head">
                  <div className="campaign-title">
                    <span className="campaign-brand">{c.campaign.brandHandle}</span>
                    <span className="muted">·</span>
                    <span className="campaign-name">{c.campaign.name}</span>
                  </div>
                  <div className="row gap-2">
                    {stalled && (
                      <span className={`stalled-flag tone-${ageTone}`}>
                        <AlertTriangle size={11} /> Stalled {ageDays}d
                      </span>
                    )}
                    <Pill color="green">Live</Pill>
                  </div>
                </div>

                {/* Single headline: official-stage chip + compact age */}
                <div className="campaign-stage-headline">
                  <span className={`stage-chip color-${stage.color}`}>
                    {stage.label}
                  </span>
                  <span className={`stage-chip-age tone-${ageTone}`}>{compactAge(c.lastUpdate)}</span>
                  <span style={{ flex: 1 }} />
                  {/* Brand-action simulate (demo) — kept as small ghost trigger */}
                  <div className="simulate-wrap">
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={() => setOpenMenu(openMenu === menuKey ? null : menuKey)}
                      title="Simulate brand action (demo only)"
                    >
                      Brand <ChevronDown size={14} />
                    </button>
                    {openMenu === menuKey && (
                      <div className="simulate-menu">
                        <div className="simulate-menu-header">Simulate brand action</div>
                        {SIMULATE_OPTIONS.map((opt) => (
                          <button
                            key={opt.type}
                            type="button"
                            className="simulate-menu-item"
                            onClick={() => fireBrandAction(c.campaign.id, opt.type)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {declineReasons.has(c.campaign.id) && cDec === 'declined' && (
                  <div className="campaign-decline-reason">
                    <span className="muted micro">Decline reason</span>
                    <div>{declineReasons.get(c.campaign.id)}</div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* ─── POOLS at the bottom (per Katie May 7) ─── */}
      <section className="campaigns-pools">
        <h3>Brand pools</h3>
        {pools.length === 0 ? (
          <p className="muted small">Not in any brand pool yet.</p>
        ) : (
          <ul className="campaigns-pools-list">
            {pools.map(({ brand, status }) => {
              const STATUS_LABEL = {
                qualified: { label: 'Qualified', color: 'green' },
                confirmed: { label: 'Confirmed', color: 'blue' },
                potential: { label: 'Potential', color: 'purple' },
                archived: { label: 'Archived', color: 'gray' },
              };
              const meta = STATUS_LABEL[status] ?? STATUS_LABEL.potential;
              return (
                <li key={brand.id} className="campaigns-pool-row">
                  <BrandLogo brand={brand} size={26} />
                  <span className="campaigns-pool-name">{brand.name}</span>
                  <span className="muted small">{brand.handle}</span>
                  <span style={{ flex: 1 }} />
                  <Pill color={meta.color}>{meta.label}</Pill>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
