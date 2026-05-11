import { useEffect, useState } from 'react';
import {
  X, Mail, Phone, Plus, MessageSquare, Star, Sparkles, Users,
  BadgeCheck, ExternalLink,
} from 'lucide-react';
import Avatar from '../../components/Avatar.jsx';
import Pill from '../../components/Pill.jsx';
import { InstagramIcon, TikTokIcon } from '../../components/SocialIcons.jsx';
import PortalStatusPill from '../../components/PortalStatusPill.jsx';
import OverviewTab from './tabs/Overview.jsx';
import ActivityTab from './tabs/Activity.jsx';
import CampaignsTab from './tabs/Campaigns.jsx';
import PreferencesTab from './tabs/Preferences.jsx';
import AICardTab from './tabs/AICard.jsx';
import LogisticsTab from './tabs/Logistics.jsx';
import ScoringTab from './tabs/Scoring.jsx';
import AssignToCampaign from './modals/AssignToCampaign.jsx';
import AssignToPool from './modals/AssignToPool.jsx';
import SendNudge from './modals/SendNudge.jsx';
import { useEventStore } from '../../store/useEventStore.jsx';
import {
  selectCreatorCampaigns, selectAllTags, selectCreatorScores, overallScoreColor,
} from '../../domain/selectors.js';

const TABS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'activity',    label: 'Activity' },
  { id: 'campaigns',   label: 'Campaigns' },
  { id: 'aicard',      label: 'AI Card' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'logistics',   label: 'Logistics' },
  { id: 'scoring',     label: 'Scoring' },
];

function formatFollowers(n) {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

// Google Calendar-inspired tag palette. Stable hash → color so admin tags
// look the same across renders. Distinct from the solid category chips so
// it reads as "label managed by ops, not a creator-declared category."
const CALENDAR_TAG_COLORS = [
  'tomato', 'tangerine', 'banana', 'sage',
  'peacock', 'blueberry', 'lavender', 'flamingo',
];
function calendarTagColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return CALENDAR_TAG_COLORS[Math.abs(h) % CALENDAR_TAG_COLORS.length];
}

export default function ProfilePanel({ entry, onClose }) {
  if (!entry) return null;
  const { creator, status, activeCampaignCount } = entry;
  const { events, campaigns } = useEventStore();
  const [tab, setTab] = useState('overview');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPoolOpen, setAssignPoolOpen] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [focusNote, setFocusNote] = useState(0);

  const campaignList = selectCreatorCampaigns(events, creator.id, campaigns);
  const campaignCount = campaignList.length;
  const tags = selectAllTags(creator);
  const scores = selectCreatorScores(events, creator.id);

  // Has any reviewed AI card?
  const hasReviewedCard = events.some(
    (e) => e.creatorId === creator.id && e.type === 'AI_CARD_REVIEWED',
  );

  useEffect(() => {
    setTab('overview');
  }, [creator.id]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !assignOpen && !assignPoolOpen && !nudgeOpen) onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, assignOpen, assignPoolOpen, nudgeOpen]);

  const primaryPlatform = (creator.platformStats?.instagram?.followers ?? 0) >= (creator.platformStats?.tiktok?.followers ?? 0)
    ? 'instagram' : 'tiktok';
  const platformsWithFollowers = ['instagram', 'tiktok'].filter(
    (p) => (creator.platformStats?.[p]?.followers ?? 0) > 0,
  );

  return (
    <section className="profile-panel" aria-label={`Profile for ${creator.name}`}>
      {/* ─────────────────── HEADER (redesigned per Katie May 8) ─────────────────── */}
      <header className="profile-header">
        <button type="button" className="profile-close" onClick={onClose} aria-label="Close profile">
          <X size={18} />
        </button>

        <div className="profile-header-main">
          <Avatar creator={creator} size={64} />
          <div className="profile-header-meta">
            <div className="profile-header-name-row">
              <h2>{creator.name}</h2>
              {hasReviewedCard && (
                <BadgeCheck
                  size={18}
                  className="profile-verified"
                  aria-label="AI card reviewed"
                />
              )}
              <PortalStatusPill status={status} />
              {scores.overall != null && (
                <span
                  className={`overall-score-pill tone-${overallScoreColor(scores.overall)}`}
                  title={
                    scores.overallMode === 'composite'
                      ? `Overall = 0.6·R(${scores.reliability?.toFixed(1)}) + 0.4·Q(${scores.quality?.toFixed(1)})`
                      : scores.overallMode === 'reliability-only'
                      ? `Reliability only · no quality ratings yet`
                      : `Quality only · no reliability data`
                  }
                >
                  {scores.overall.toFixed(1)}
                </span>
              )}
              {scores.overall == null && scores.isNew && (
                <span className="overall-score-pill tone-gray" title="No history yet">
                  New
                </span>
              )}
              {activeCampaignCount > 0 && (
                <Pill color="purple">{activeCampaignCount} active</Pill>
              )}
            </div>

            <div className="profile-header-handle">
              {creator.handle}
              {creator.locationCity && (
                <span className="muted"> · {creator.locationCity}</span>
              )}
              {scores.reliability != null && (
                <span className="muted">
                  {' · '}Reliability {scores.reliability.toFixed(1)}/10
                </span>
              )}
            </div>

            {creator.contentNiche && (
              <div className="profile-header-bio">{creator.contentNiche}</div>
            )}

            {creator.categories?.length > 0 && (
              <div className="profile-header-tags">
                {creator.categories.slice(0, 3).map((t) => (
                  <span key={t} className="tag-mini">{t}</span>
                ))}
              </div>
            )}

            {/* Admin-managed tags — Google Calendar-style chip (colored dot
                + text) so they read as visually distinct from the solid
                category chips above. (Katie May 8) */}
            {tags.length > 0 && (
              <div className="profile-admin-tags">
                {tags.slice(0, 6).map((t) => {
                  const color = calendarTagColor(t);
                  return (
                    <span key={t} className={`calendar-tag color-${color}`}>
                      <span className={`calendar-tag-dot color-${color}`} aria-hidden="true" />
                      {t.replace(/-/g, ' ')}
                    </span>
                  );
                })}
                {tags.length > 6 && <span className="muted small">+{tags.length - 6}</span>}
              </div>
            )}

            <div className="profile-header-contact">
              <a href={`mailto:${creator.email}`} className="contact-link">
                <Mail size={13} /> {creator.email}
              </a>
              {creator.phone && (
                <a href={`tel:${creator.phone.replace(/\s+/g, '')}`} className="contact-link">
                  <Phone size={13} /> {creator.phone}
                </a>
              )}
              <span className="profile-header-socials">
                {creator.socials?.includes('instagram') && (
                  <span className="social-icon-svg" title="Instagram"><InstagramIcon size={16} /></span>
                )}
                {creator.socials?.includes('tiktok') && (
                  <span className="social-icon-svg" title="TikTok"><TikTokIcon size={16} /></span>
                )}
              </span>
            </div>
          </div>

          {creator.benableHandle && (
            <a
              href={`https://benable.com/${creator.benableHandle}`}
              target="_blank"
              rel="noreferrer"
              className="btn-view-in-benable"
              title={`benable.com/${creator.benableHandle}`}
            >
              <ExternalLink size={13} /> View in Benable
            </a>
          )}
        </div>

        {/* Stat tiles — Reliability + Top tags removed per Katie May 8.
            Reliability is now inline next to the handle; tags live in the
            admin-tags strip above. Followers + Quality keep their tiles
            since they don't fit cleanly inline. */}
        {(platformsWithFollowers.length > 0 || scores.quality != null) && (
          <div className="profile-stats profile-stats-2col">
            {platformsWithFollowers.length > 0 && (
              <div className="profile-stat">
                <div className="profile-stat-label">Followers</div>
                <div className="profile-stat-value">
                  {platformsWithFollowers.map((p, i) => (
                    <span key={p} className="profile-stat-platform">
                      {i > 0 && <span className="profile-stat-sep">·</span>}
                      <span className="profile-stat-platform-badge">{p === 'instagram' ? 'IG' : 'TT'}</span>
                      <span className="profile-stat-platform-num">
                        {formatFollowers(creator.platformStats[p].followers)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {scores.quality != null && (
              <div className="profile-stat">
                <div className="profile-stat-label">Quality</div>
                <div className="profile-stat-value">
                  <Star size={14} fill="currentColor" className="profile-stat-icon" />
                  <span className="profile-stat-num">{scores.quality.toFixed(1)}</span>
                  <span className="profile-stat-suffix">({scores.qualityCount})</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="profile-actions">
          <button type="button" className="btn primary" onClick={() => setAssignOpen(true)}>
            <Plus size={14} /> Assign to Campaign
          </button>
          <button type="button" className="btn secondary" onClick={() => setAssignPoolOpen(true)}>
            <Users size={14} /> Assign to Pool
          </button>
          <button type="button" className="btn secondary" onClick={() => setNudgeOpen(true)}>
            <MessageSquare size={14} /> Send Nudge
          </button>
        </div>
      </header>

      {/* ─────────────────── EXPANDED TABS ─────────────────── */}
      <nav className="profile-tabs" role="tablist">
        {TABS.map((t) => {
          let count = null;
          if (t.id === 'campaigns') count = campaignCount;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`profile-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}{count != null ? ` (${count})` : ''}
              {t.id === 'aicard' && hasReviewedCard && (
                <Sparkles size={12} className="profile-tab-icon-after" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="profile-tab-body">
        {tab === 'overview' && <OverviewTab creator={creator} onSwitchTab={setTab} onClose={onClose} />}
        {tab === 'activity' && <ActivityTab creator={creator} focusNoteKey={focusNote} />}
        {tab === 'campaigns' && (
          <CampaignsTab creator={creator} onOpenAssign={() => setAssignOpen(true)} />
        )}
        {tab === 'aicard' && <AICardTab creator={creator} />}
        {tab === 'preferences' && <PreferencesTab creator={creator} />}
        {tab === 'logistics' && <LogisticsTab creator={creator} />}
        {tab === 'scoring' && <ScoringTab creator={creator} scores={scores} />}
      </div>

      {assignOpen && (
        <AssignToCampaign creator={creator} onClose={() => setAssignOpen(false)} />
      )}
      {assignPoolOpen && (
        <AssignToPool creator={creator} onClose={() => setAssignPoolOpen(false)} />
      )}
      {nudgeOpen && (
        <SendNudge creator={creator} status={status} onClose={() => setNudgeOpen(false)} />
      )}
    </section>
  );
}
