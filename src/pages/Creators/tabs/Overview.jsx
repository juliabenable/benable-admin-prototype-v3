import { useMemo, useState } from 'react';
import { ArrowRight, Sparkles, Star, MessageCircle } from 'lucide-react';
import { useEventStore } from '../../../store/useEventStore.jsx';
import {
  selectCreatorCampaigns, selectActivityFeed, selectCreatorBrandPools,
  TODAY_ISO,
} from '../../../domain/selectors.js';
import { useToast } from '../../../components/Toast.jsx';
import Pill from '../../../components/Pill.jsx';
import { formatRelative, formatFullDate, formatDateTimeShort } from '../../../components/RelativeTime.jsx';
import { EVENT_TYPES as E } from '../../../domain/events.js';
import BrandLogo from '../../Brands/BrandLogo.jsx';

const STATUS_PILL = {
  live: { label: 'Live', color: 'green' },
  draft: { label: 'Draft', color: 'gray' },
  completed: { label: 'Completed', color: 'purple' },
};

const POOL_STATUS_PILL = {
  qualified: { label: 'Qualified', color: 'green' },
  confirmed: { label: 'Confirmed', color: 'blue' },
  potential: { label: 'Potential', color: 'purple' },
  archived: { label: 'Archived', color: 'gray' },
};

function timeInStage(iso) {
  if (!iso) return '—';
  const days = Math.max(0, Math.floor((Date.parse(TODAY_ISO) - Date.parse(iso)) / 86400000));
  if (days === 0) return 'today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 60) return '1 month';
  return `${Math.round(days / 30)} months`;
}

export default function OverviewTab({ creator, onSwitchTab }) {
  const { events, campaigns, brands, appendEvent } = useEventStore();
  const toast = useToast();

  const creatorCampaigns = useMemo(
    () => selectCreatorCampaigns(events, creator.id, campaigns),
    [events, creator.id, campaigns],
  );
  const pools = useMemo(
    () => selectCreatorBrandPools(events, creator.id, brands),
    [events, creator.id, brands],
  );
  const activeCampaigns = creatorCampaigns.filter(
    (c) => c.campaign.status === 'live' && c.stage !== 'NONE' && c.stage !== 'DECLINED',
  );
  const completedCampaigns = creatorCampaigns.filter((c) => c.campaign.status === 'completed');

  // Pull the top 3 most recent activity events
  const recentActivity = useMemo(
    () => selectActivityFeed(events, creator.id).slice(0, 3),
    [events, creator.id],
  );

  // Per-campaign rating lookup
  const campaignRatings = useMemo(() => {
    const m = new Map();
    for (const e of events) {
      if (e.creatorId !== creator.id) continue;
      if (e.type === E.CAMPAIGN_RATED && e.payload?.rating != null) {
        m.set(e.campaignId, e.payload.rating);
      }
    }
    return m;
  }, [events, creator.id]);

  // ── Notes ──
  const notes = useMemo(
    () => selectActivityFeed(events, creator.id).filter((e) => e.type === E.NOTE_ADDED),
    [events, creator.id],
  );
  const [noteBody, setNoteBody] = useState('');
  const [noteFocused, setNoteFocused] = useState(false);

  function saveNote() {
    const trimmed = noteBody.trim();
    if (!trimmed) return;
    appendEvent({
      type: E.NOTE_ADDED,
      creatorId: creator.id,
      actor: { kind: 'ops', name: 'Julia' },
      payload: { body: trimmed },
    });
    setNoteBody('');
    setNoteFocused(false);
    toast('Note added');
  }

  return (
    <div className="overview-tab">
      {/* ─── POOLS ─── */}
      <section className="overview-section">
        <div className="overview-section-head">
          <h3>Pools</h3>
          <span className="muted small">
            {pools.length} {pools.length === 1 ? 'pool' : 'pools'}
          </span>
        </div>
        {pools.length === 0 ? (
          <div className="overview-empty">Not in any brand pool yet.</div>
        ) : (
          <ul className="overview-pool-list">
            {pools.map(({ brand, status }) => {
              const statusMeta = POOL_STATUS_PILL[status];
              return (
                <li key={brand.id} className="overview-pool-row">
                  <BrandLogo brand={brand} size={28} />
                  <span className="overview-pool-name">{brand.name}</span>
                  <span className="muted small">{brand.handle}</span>
                  <span style={{ flex: 1 }} />
                  <Pill color={statusMeta.color}>{statusMeta.label}</Pill>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ─── CAMPAIGNS ─── */}
      <section className="overview-section">
        <div className="overview-section-head">
          <h3>Campaigns</h3>
          <span className="muted small">
            {activeCampaigns.length} active{completedCampaigns.length > 0 ? ` · ${completedCampaigns.length} completed` : ''}
          </span>
        </div>
        {creatorCampaigns.length === 0 ? (
          <div className="overview-empty">Not in any campaign yet.</div>
        ) : (
          <ul className="overview-campaign-list">
            {creatorCampaigns.map((c) => {
              const status = STATUS_PILL[c.campaign.status] ?? STATUS_PILL.draft;
              const rating = campaignRatings.get(c.campaign.id);
              return (
                <li key={c.campaign.id} className="overview-campaign-row">
                  <div className="overview-campaign-head">
                    <span className="overview-campaign-name">
                      {c.campaign.brandHandle} · {c.campaign.name}
                    </span>
                    <Pill color={status.color}>{status.label}</Pill>
                  </div>
                  <div className="overview-campaign-meta">
                    <span className="overview-campaign-stage">
                      <span className="muted micro">Stage</span>
                      <span className="overview-campaign-stage-val">{c.stageLabel}</span>
                    </span>
                    {c.campaign.status !== 'completed' && (
                      <span>
                        <span className="muted micro">Time in stage</span>
                        <span className="overview-campaign-stage-val">{timeInStage(c.lastUpdate)}</span>
                      </span>
                    )}
                    {rating != null && (
                      <span className="overview-campaign-rating">
                        <Star size={12} fill="currentColor" /> {rating}/10
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ─── RECENT ACTIVITY (top 3) ─── */}
      <section className="overview-section">
        <div className="overview-section-head">
          <h3>Recent activity</h3>
          {recentActivity.length > 0 && (
            <button
              type="button"
              className="overview-link"
              onClick={() => onSwitchTab?.('activity')}
            >
              View all <ArrowRight size={11} />
            </button>
          )}
        </div>{/* recent activity body unchanged below */}
        {recentActivity.length === 0 ? (
          <div className="overview-empty">No activity yet.</div>
        ) : (
          <ul className="overview-activity-list">
            {recentActivity.map((event) => {
              const campaign = event.campaignId ? campaigns.find((c) => c.id === event.campaignId) : null;
              const brand = event.brandId ? brands.find((b) => b.id === event.brandId) : null;
              const ctx = campaign
                ? `${campaign.brandHandle} · ${campaign.name}`
                : (brand ? `${brand.name} pool` : '');
              const label = humanizeEventType(event.type);
              const actor = event.actor?.kind ?? 'system';
              return (
                <li key={event.id} className={`overview-activity-row actor-${actor}`}>
                  <span className={`timeline-dot tone-${actorTone(actor)}`} style={{ width: 22, height: 22 }}>
                    <Sparkles size={11} />
                  </span>
                  <div className="overview-activity-body">
                    <div className="overview-activity-label">{label}</div>
                    {ctx && <div className="muted small">{ctx}</div>}
                    <div className="muted small" title={formatFullDate(event.timestamp)}>
                      {formatRelative(event.timestamp)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ─── NOTES (at bottom of overview, per Katie May 7) ─── */}
      <section className="overview-section">
        <div className="overview-section-head">
          <h3><MessageCircle size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />Notes ({notes.length})</h3>
        </div>

        {/* Compact input row — expands when focused or has content */}
        <div className={`overview-note-compose ${(noteFocused || noteBody) ? 'expanded' : ''}`}>
          {(noteFocused || noteBody) ? (
            <textarea
              autoFocus
              className="textarea"
              placeholder="Add a note..."
              rows={3}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              onBlur={() => { if (!noteBody) setNoteFocused(false); }}
            />
          ) : (
            <input
              className="input"
              placeholder="Add a note..."
              onFocus={() => setNoteFocused(true)}
              readOnly
            />
          )}
          <button
            type="button"
            className="btn primary small"
            disabled={!noteBody.trim()}
            onClick={saveNote}
          >
            Add
          </button>
        </div>

        {notes.length > 0 && (
          <ul className="overview-notes-list">
            {notes.map((n) => (
              <li key={n.id} className="overview-note-card">
                <div className="overview-note-meta">
                  <span className="overview-note-author">{n.actor?.name ?? 'Ops'}</span>
                  <span className="muted small">{formatDateTimeShort(n.timestamp)}</span>
                </div>
                <div className="overview-note-body">{n.payload?.body}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function actorTone(actorKind) {
  if (actorKind === 'creator') return 'purple';
  if (actorKind === 'brand') return 'yellow';
  if (actorKind === 'ops') return 'blue';
  return 'gray';
}

function humanizeEventType(t) {
  // Friendly labels for the most common events; fallback to a snake-case translation
  const map = {
    [E.CREATOR_ADDED]: 'Added to system',
    [E.PORTAL_INVITE_SENT]: 'Portal invite sent',
    [E.PORTAL_INVITE_VIEWED]: 'Portal invite viewed',
    [E.ONBOARDING_COMPLETED]: 'Onboarding complete',
    [E.NUDGE_SENT]: 'Nudge sent',
    [E.NOTE_ADDED]: 'Note added',
    [E.ASSIGNED_TO_CAMPAIGN]: 'Assigned to campaign',
    [E.CAMPAIGN_ACCEPTED]: 'Accepted campaign',
    [E.CAMPAIGN_DECLINED]: 'Declined campaign',
    [E.PRODUCT_SELECTED]: 'Products selected',
    [E.ORDER_PLACED]: 'Order placed',
    [E.PRODUCT_SHIPPED]: 'Product shipped',
    [E.DELIVERY_CONFIRMED]: 'Delivery confirmed',
    [E.CONTENT_SUBMITTED]: 'Content submitted',
    [E.CONTENT_APPROVED]: 'Content approved',
    [E.CONTENT_LIVE]: 'Content live',
    [E.BRAND_INVITED]: 'Invited by brand',
    [E.BRAND_ACCEPTED]: 'Accepted by brand',
    [E.BRAND_REJECTED]: 'Rejected by brand',
    [E.BRAND_POOL_ADDED]: 'Added to brand pool',
    [E.BRAND_POOL_QUALIFIED]: 'Qualified for brand',
    [E.AI_CARD_REVIEWED]: 'AI card reviewed',
    [E.CAMPAIGN_RATED]: 'Campaign rated',
  };
  return map[t] ?? t.replace(/_/g, ' ').toLowerCase();
}
