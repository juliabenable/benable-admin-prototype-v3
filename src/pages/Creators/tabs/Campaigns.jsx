import { useMemo, useState } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import { useEventStore } from '../../../store/useEventStore.jsx';
import { selectCreatorCampaigns, TODAY_ISO } from '../../../domain/selectors.js';
import { useToast } from '../../../components/Toast.jsx';
import Pill from '../../../components/Pill.jsx';
import { EVENT_TYPES as E } from '../../../domain/events.js';

const BRAND_DECISION = {
  null: { label: 'Not yet visible', color: 'gray' },
  INVITED: { label: 'Invited by brand', color: 'blue' },
  ACCEPTED: { label: 'Accepted by brand', color: 'green' },
  REJECTED: { label: 'Rejected by brand', color: 'red' },
  NO_RESPONSE: { label: 'No response from brand', color: 'yellow' },
};

const STATUS_PILL = {
  live: { label: 'Live', color: 'green' },
  draft: { label: 'Draft', color: 'gray' },
  completed: { label: 'Completed', color: 'purple' },
};

const SIMULATE_OPTIONS = [
  { type: E.BRAND_INVITED, label: 'Brand invited' },
  { type: E.BRAND_ACCEPTED, label: 'Brand accepted' },
  { type: E.BRAND_REJECTED, label: 'Brand rejected' },
  { type: E.BRAND_NO_RESPONSE, label: 'Brand: no response' },
  { type: E.PRODUCT_SHIPPED, label: 'Product shipped' },
];

function timeInStage(iso) {
  if (!iso) return '—';
  const days = Math.max(0, Math.floor((Date.parse(TODAY_ISO) - Date.parse(iso)) / 86400000));
  if (days === 0) return 'today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 60) return '1 month';
  return `${Math.round(days / 30)} months`;
}

export default function CampaignsTab({ creator, onOpenAssign }) {
  const { events, campaigns, appendEvent } = useEventStore();
  const toast = useToast();
  const list = useMemo(
    () => selectCreatorCampaigns(events, creator.id, campaigns),
    [events, creator.id, campaigns],
  );
  const [openMenu, setOpenMenu] = useState(null);

  function toggleVisibility(campaignId, currentVisible) {
    appendEvent({
      type: E.VISIBLE_TO_BRAND_TOGGLED,
      creatorId: creator.id,
      campaignId,
      actor: { kind: 'ops', name: 'Julia' },
      payload: { visible: !currentVisible },
    });
    toast(`${!currentVisible ? 'Made visible' : 'Hidden'} to brand`);
  }

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
        <h3>Campaigns ({list.length})</h3>
        <button type="button" className="btn primary small" onClick={onOpenAssign}>
          <Plus size={14} /> Assign to New Campaign
        </button>
      </div>

      {list.length === 0 ? (
        <div className="tab-empty">No campaigns yet. Use “Assign to New Campaign” to add this creator.</div>
      ) : (
        <ul className="campaign-card-list">
          {list.map((c) => {
            const status = STATUS_PILL[c.campaign.status] ?? STATUS_PILL.draft;
            const decision = BRAND_DECISION[c.brandDecision ?? 'null'];
            const menuKey = c.campaign.id;
            return (
              <li key={c.campaign.id} className="campaign-card">
                <div className="campaign-card-head">
                  <div className="campaign-title">
                    <span className="campaign-brand">{c.campaign.brandHandle}</span>
                    <span className="muted">·</span>
                    <span className="campaign-name">{c.campaign.name}</span>
                  </div>
                  <Pill color={status.color}>{status.label}</Pill>
                </div>
                <div className="campaign-stats">
                  <div className="campaign-stat">
                    <div className="muted micro">Stage</div>
                    <Pill color="purple">{c.stageLabel}</Pill>
                  </div>
                  <div className="campaign-stat">
                    <div className="muted micro">Time in Stage</div>
                    <div className="campaign-stat-val">{timeInStage(c.lastUpdate)}</div>
                  </div>
                  <div className="campaign-stat">
                    <div className="muted micro">Brand decision</div>
                    <div className="row gap-2">
                      <Pill color={decision.color}>{decision.label}</Pill>
                      {c.campaign.status === 'live' && (
                        <div className="simulate-wrap">
                          <button
                            type="button"
                            className="btn ghost small"
                            onClick={() => setOpenMenu(openMenu === menuKey ? null : menuKey)}
                            title="Simulate brand action (demo only)"
                          >
                            <ChevronDown size={14} />
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
                      )}
                    </div>
                  </div>
                </div>
                <div className="campaign-card-footer">
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={c.visibleToBrand}
                      onChange={() => toggleVisibility(c.campaign.id, c.visibleToBrand)}
                    />
                    <span>Visible to brand</span>
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
