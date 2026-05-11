import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Star, MessageCircle, AlertTriangle, ChevronRight, AlertCircle } from 'lucide-react';
import { useEventStore } from '../../../store/useEventStore.jsx';
import {
  selectCreatorCampaigns, selectActivityFeed, selectCreatorBrandPools,
  TODAY_ISO,
} from '../../../domain/selectors.js';
import { useToast } from '../../../components/Toast.jsx';
import Pill from '../../../components/Pill.jsx';
import { formatRelative, formatFullDate, formatDateTime, formatDateTimeShort } from '../../../components/RelativeTime.jsx';
import { EVENT_TYPES as E } from '../../../domain/events.js';
import BrandLogo from '../../Brands/BrandLogo.jsx';
import {
  EVENT_META, ACTOR_LABEL, actorTone, eventSubline,
} from './Activity.jsx';

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

function stageAgeDays(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.parse(TODAY_ISO) - Date.parse(iso)) / 86400000));
}

function stageAgeTone(days) {
  if (days >= 14) return 'red';
  if (days >= 7) return 'yellow';
  return 'gray';
}

function timeInStage(iso) {
  if (!iso) return '—';
  const days = stageAgeDays(iso);
  if (days === 0) return 'today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 60) return '1 month';
  return `${Math.round(days / 30)} months`;
}

export default function OverviewTab({ creator, onSwitchTab, onClose }) {
  const { events, campaigns, brands, appendEvent } = useEventStore();
  const toast = useToast();
  const navigate = useNavigate();

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

  // Top 3 most recent activity events — notes are EXCLUDED (live in Notes section)
  const recentActivity = useMemo(
    () => selectActivityFeed(events, creator.id)
      .filter((e) => e.type !== E.NOTE_ADDED)
      .slice(0, 3),
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

  // Navigation: close the profile panel, then route to the brand's page.
  function goToPool(brandId) {
    onClose?.();
    navigate(`/admin/brands/${brandId}/pool`);
  }
  function goToCampaign(campaignBrandHandle, campaignId) {
    const brand = brands.find((b) => b.handle === campaignBrandHandle);
    onClose?.();
    if (brand) {
      navigate(`/admin/brands/${brand.id}/campaigns?focus=${campaignId}`);
    } else {
      navigate('/admin/brands');
    }
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
                <li
                  key={brand.id}
                  className="overview-pool-row clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => goToPool(brand.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToPool(brand.id); } }}
                  title={`Open ${brand.name} pool`}
                >
                  <BrandLogo brand={brand} size={28} />
                  <span className="overview-pool-name">{brand.name}</span>
                  <span className="muted small">{brand.handle}</span>
                  <span style={{ flex: 1 }} />
                  <Pill color={statusMeta.color}>{statusMeta.label}</Pill>
                  <ChevronRight size={14} className="overview-row-chev" />
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
              const ageDays = stageAgeDays(c.lastUpdate);
              const ageTone = stageAgeTone(ageDays);
              const stalled = c.campaign.status === 'live' && ageDays >= 7;
              return (
                <li
                  key={c.campaign.id}
                  className="overview-campaign-row clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => goToCampaign(c.campaign.brandHandle, c.campaign.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToCampaign(c.campaign.brandHandle, c.campaign.id); } }}
                  title={`Open ${c.campaign.name}`}
                >
                  <div className="overview-campaign-head">
                    <span className="overview-campaign-name">
                      {c.campaign.brandHandle} · {c.campaign.name}
                    </span>
                    <div className="row gap-2">
                      {stalled && (
                        <span className={`stalled-flag tone-${ageTone}`} title={`Stalled ${ageDays} day${ageDays === 1 ? '' : 's'} in stage`}>
                          <AlertTriangle size={11} /> {ageDays}d
                        </span>
                      )}
                      <Pill color={status.color}>{status.label}</Pill>
                      <ChevronRight size={14} className="overview-row-chev" />
                    </div>
                  </div>
                  <div className="overview-campaign-meta">
                    {c.officialStage && (
                      <span className={`stage-chip color-${c.officialStage.color}`}>
                        {c.officialStage.label}
                      </span>
                    )}
                    {c.campaign.status !== 'completed' && (
                      <span className={`stage-chip-age tone-${ageTone}`}>
                        {timeInStage(c.lastUpdate)}
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

      {/* ─── RECENT ACTIVITY (top 3, matches Activity-tab timeline design) ─── */}
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
        </div>
        {recentActivity.length === 0 ? (
          <div className="overview-empty">No activity yet.</div>
        ) : (
          <ol className="timeline timeline-compact">
            {recentActivity.map((event) => {
              const meta = EVENT_META[event.type] ?? { label: event.type, icon: AlertCircle, tone: 'gray' };
              const Icon = meta.icon;
              const tone = actorTone(event.actor, meta.tone);
              const sub = eventSubline(event, campaigns, brands);
              const actorLabel = ACTOR_LABEL[event.actor?.kind] ?? null;
              return (
                <li key={event.id} className={`timeline-item actor-${event.actor?.kind ?? 'system'}`}>
                  <span className={`timeline-dot tone-${tone}`}>
                    <Icon size={14} />
                  </span>
                  <div className="timeline-body">
                    <div className="timeline-label-row">
                      <span className="timeline-label">{meta.label}</span>
                      {actorLabel && (
                        <span className={`timeline-actor-badge tone-${tone}`}>{actorLabel}</span>
                      )}
                    </div>
                    {sub && <div className="timeline-sub">{sub}</div>}
                    <div className="timeline-time" title={formatFullDate(event.timestamp)}>
                      {formatDateTime(event.timestamp)}
                      <span className="timeline-time-relative muted"> · {formatRelative(event.timestamp)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
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
