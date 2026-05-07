import { useEffect, useState } from 'react';
import {
  X, Mail, Phone, MapPin, Plus, MessageSquare, Star, CheckCircle2, Sparkles, Users,
} from 'lucide-react';
import Avatar from '../../components/Avatar.jsx';
import Pill from '../../components/Pill.jsx';
import { InstagramIcon, TikTokIcon, BenableIcon } from '../../components/SocialIcons.jsx';
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
      {/* ─────────────────── HEADER (above-the-fold summary) ─────────────────── */}
      <header className="profile-header">
        <button type="button" className="profile-close" onClick={onClose} aria-label="Close profile">
          <X size={18} />
        </button>

        <div className="profile-header-main">
          <Avatar creator={creator} size={64} />
          <div className="profile-header-meta">
            <div className="profile-header-name-row">
              <h2>{creator.name}</h2>
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
              <PortalStatusPill status={status} />
              {hasReviewedCard && (
                <span className="profile-reviewed-badge" title="AI card reviewed">
                  <CheckCircle2 size={12} /> Reviewed
                </span>
              )}
              {activeCampaignCount > 0 && (
                <Pill color="purple">{activeCampaignCount} active</Pill>
              )}
            </div>
            <div className="profile-header-handle">
              {creator.handle}
              {creator.benableHandle && (
                <span className="muted small"> · benable.com/{creator.benableHandle}</span>
              )}
            </div>
            <div className="profile-header-contact">
              <span className="row gap-1"><Mail size={13} /> {creator.email}</span>
              {creator.phone && <span className="row gap-1"><Phone size={13} /> {creator.phone}</span>}
              {creator.locationCity && <span className="row gap-1"><MapPin size={13} /> {creator.locationCity}</span>}
              {creator.benableHandle && (
                <a
                  href={`https://benable.com/${creator.benableHandle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="social-icon-svg"
                  title={`benable.com/${creator.benableHandle}`}
                >
                  <BenableIcon size={16} />
                </a>
              )}
              {creator.socials?.includes('instagram') && (
                <span className="social-icon-svg" title="Instagram"><InstagramIcon size={16} /></span>
              )}
              {creator.socials?.includes('tiktok') && (
                <span className="social-icon-svg" title="TikTok"><TikTokIcon size={16} /></span>
              )}
            </div>
          </div>
        </div>

        {/* Above-the-fold summary metrics */}
        <div className="profile-summary-grid">
          {platformsWithFollowers.length > 0 && (
            <div className="profile-summary-stat">
              <div className="profile-summary-num">
                {platformsWithFollowers.map((p) => (
                  <span key={p} className="profile-summary-platform">
                    <span className="profile-summary-platform-label">{p === 'instagram' ? 'IG' : 'TT'}</span>
                    {formatFollowers(creator.platformStats[p].followers)}
                  </span>
                ))}
              </div>
              <div className="profile-summary-label">Followers</div>
            </div>
          )}
          {scores.reliability != null && (
            <div className="profile-summary-stat">
              <div className="profile-summary-num">
                {scores.reliability.toFixed(1)}<span className="muted small"> /10</span>
              </div>
              <div className="profile-summary-label">Reliability</div>
            </div>
          )}
          {scores.quality != null && (
            <div className="profile-summary-stat">
              <div className="profile-summary-num">
                <Star size={14} fill="currentColor" /> {scores.quality.toFixed(1)}
              </div>
              <div className="profile-summary-label">Quality ({scores.qualityCount})</div>
            </div>
          )}
          {creator.contentNiche && (
            <div className="profile-summary-stat profile-summary-niche">
              <div className="profile-summary-num">{creator.contentNiche}</div>
              <div className="profile-summary-label">Niche</div>
            </div>
          )}
          {tags.length > 0 && (
            <div className="profile-summary-stat profile-summary-tags-cell">
              <div className="profile-summary-tags">
                {tags.slice(0, 3).map((t) => (
                  <span key={t} className="tag-mini">{t.replace(/-/g, ' ')}</span>
                ))}
                {tags.length > 3 && <span className="muted small">+{tags.length - 3}</span>}
              </div>
              <div className="profile-summary-label">Top tags</div>
            </div>
          )}
        </div>

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
        {tab === 'overview' && <OverviewTab creator={creator} onSwitchTab={setTab} />}
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
