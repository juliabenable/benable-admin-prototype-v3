import { useEffect, useMemo, useState } from 'react';
import {
  X, Mail, Phone, Plus, MessageSquare, StickyNote, Sparkles,
  BadgeCheck, ExternalLink,
} from 'lucide-react';
import Avatar from '../../components/Avatar.jsx';
import Pill from '../../components/Pill.jsx';
import { InstagramIcon, TikTokIcon } from '../../components/SocialIcons.jsx';
import PortalStatusPill from '../../components/PortalStatusPill.jsx';
import ActivityTab from './tabs/Activity.jsx';
import CampaignsTab from './tabs/Campaigns.jsx';
import NotesTab from './tabs/Notes.jsx';
import PreferencesTab from './tabs/Preferences.jsx';
import AssignToCampaign from './modals/AssignToCampaign.jsx';
import SendNudge from './modals/SendNudge.jsx';
import { useEventStore } from '../../store/useEventStore.jsx';
import {
  selectCreatorCampaigns, selectCreatorScores,
} from '../../domain/selectors.js';
import { EVENT_TYPES as E } from '../../domain/events.js';

// Simplified to 4 tabs per Katie May 8 design ref. The previous Overview /
// AI Card / Logistics / Scoring tabs are still in the codebase but no longer
// surfaced — their content is either redundant (Overview) or accessible from
// the relevant action button / modal.
const TABS = [
  { id: 'activity',    label: 'Activity' },
  { id: 'campaigns',   label: 'Campaigns' },
  { id: 'notes',       label: 'Notes' },
  { id: 'preferences', label: 'Preferences' },
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
  const [tab, setTab] = useState('activity');
  const [assignOpen, setAssignOpen] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [focusNote, setFocusNote] = useState(0);

  const campaignList = selectCreatorCampaigns(events, creator.id, campaigns);
  const campaignCount = campaignList.length;
  const scores = selectCreatorScores(events, creator.id);

  // Note count for the Notes tab badge
  const noteCount = useMemo(
    () => events.filter((e) => e.creatorId === creator.id && e.type === E.NOTE_ADDED).length,
    [events, creator.id],
  );

  // Top-of-stage chip: the creator's most-active campaign stage, shown next
  // to the name as in the design ref ("Content submitted").
  const topStage = useMemo(() => {
    const live = campaignList.filter((c) => c.campaign.status === 'live' && c.officialStage);
    if (!live.length) return null;
    // most recent activity wins
    live.sort((a, b) => (b.lastUpdate ?? '').localeCompare(a.lastUpdate ?? ''));
    return live[0].officialStage;
  }, [campaignList]);

  // Has any reviewed AI card?
  const hasReviewedCard = events.some(
    (e) => e.creatorId === creator.id && e.type === 'AI_CARD_REVIEWED',
  );

  useEffect(() => {
    setTab('activity');
  }, [creator.id]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !assignOpen && !nudgeOpen) onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, assignOpen, nudgeOpen]);

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
          <Avatar creator={creator} size={48} />
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
              {/* Current campaign stage chip — shown when creator has a live
                  campaign. Replaces the busier portal-status pill at the top
                  of the name row per the May 8 design ref. */}
              {topStage && (
                <span className={`stage-chip color-${topStage.color}`}>
                  {topStage.label}
                </span>
              )}
              {activeCampaignCount > 0 && (
                <Pill color="purple"><Sparkles size={11} /> {activeCampaignCount} active</Pill>
              )}
            </div>

            <div className="profile-header-handle">
              {creator.handle}
              {creator.locationCity && (
                <span className="muted"> · {creator.locationCity}</span>
              )}
            </div>

            <div className="profile-header-contact">
              <a href={`mailto:${creator.email}`} className="contact-link">
                <Mail size={14} /> {creator.email}
              </a>
              {creator.phone && (
                <a href={`tel:${creator.phone.replace(/\s+/g, '')}`} className="contact-link">
                  <Phone size={14} /> {creator.phone}
                </a>
              )}
              <span className="profile-header-socials">
                {creator.socials?.includes('instagram') && (
                  <span className="social-icon-svg" title="Instagram"><InstagramIcon size={14} /></span>
                )}
                {creator.socials?.includes('tiktok') && (
                  <span className="social-icon-svg" title="TikTok"><TikTokIcon size={14} /></span>
                )}
              </span>
            </div>

            {/* Portal status moves to a small secondary row so the busy
                cluster near the name reads cleanly. */}
            <div className="profile-header-secondary">
              <PortalStatusPill status={status} />
              {(() => {
                const path = creator.benableHandle ?? creator.handle?.replace(/^@/, '');
                if (!path) return null;
                return (
                  <a
                    href={`https://benable.com/${path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-view-in-benable"
                    title={`benable.com/${path}`}
                  >
                    <ExternalLink size={13} /> View in Benable
                  </a>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <button type="button" className="btn primary" onClick={() => setAssignOpen(true)}>
            <Plus size={14} /> Assign to Campaign
          </button>
          <button type="button" className="btn secondary" onClick={() => setNudgeOpen(true)}>
            <MessageSquare size={14} /> Send Nudge
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => { setTab('notes'); setFocusNote((k) => k + 1); }}
          >
            <StickyNote size={14} /> Note
          </button>
        </div>
      </header>

      {/* ─────────────────── TABS ─────────────────── */}
      <nav className="profile-tabs" role="tablist">
        {TABS.map((t) => {
          let count = null;
          if (t.id === 'campaigns') count = campaignCount;
          else if (t.id === 'notes') count = noteCount;
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
            </button>
          );
        })}
      </nav>

      <div className="profile-tab-body">
        {tab === 'activity' && <ActivityTab creator={creator} />}
        {tab === 'campaigns' && (
          <CampaignsTab creator={creator} onOpenAssign={() => setAssignOpen(true)} />
        )}
        {tab === 'notes' && <NotesTab creator={creator} focusKey={focusNote} />}
        {tab === 'preferences' && <PreferencesTab creator={creator} />}
      </div>

      {assignOpen && (
        <AssignToCampaign creator={creator} onClose={() => setAssignOpen(false)} />
      )}
      {nudgeOpen && (
        <SendNudge creator={creator} status={status} onClose={() => setNudgeOpen(false)} />
      )}
    </section>
  );
}
