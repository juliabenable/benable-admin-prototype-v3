import { useEffect, useState } from 'react';
import { X, Mail, Phone, Plus, MessageSquare } from 'lucide-react';
import Avatar from '../../components/Avatar.jsx';
import Pill from '../../components/Pill.jsx';
import ActivityTab from './tabs/Activity.jsx';
import CampaignsTab from './tabs/Campaigns.jsx';
import PreferencesTab from './tabs/Preferences.jsx';
import AssignToCampaign from './modals/AssignToCampaign.jsx';
import SendNudge from './modals/SendNudge.jsx';
import { useEventStore } from '../../store/useEventStore.jsx';
import { selectCreatorCampaigns } from '../../domain/selectors.js';

const TABS = [
  { id: 'activity',    label: 'Activity' },
  { id: 'campaigns',   label: 'Campaigns' },
  { id: 'preferences', label: 'Preferences' },
];

export default function ProfilePanel({ entry, onClose }) {
  const { creator, status, activeCampaignCount } = entry;
  const { events, campaigns } = useEventStore();
  const [tab, setTab] = useState('activity');
  const [assignOpen, setAssignOpen] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [focusNote, setFocusNote] = useState(0);
  const campaignCount = selectCreatorCampaigns(events, creator.id, campaigns).length;

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

  function focusNoteInput() {
    setTab('activity');
    setFocusNote((n) => n + 1);
  }

  return (
    <section className="profile-panel" aria-label={`Profile for ${creator.name}`}>
      <header className="profile-header">
        <button type="button" className="profile-close" onClick={onClose} aria-label="Close profile">
          <X size={18} />
        </button>

        <div className="profile-header-main">
          <Avatar creator={creator} size={64} />
          <div className="profile-header-meta">
            <div className="profile-header-name-row">
              <h2>{creator.name}</h2>
              <Pill color={status.color}>{status.label}</Pill>
              {activeCampaignCount > 0 && (
                <Pill color="purple">{activeCampaignCount} active</Pill>
              )}
            </div>
            <div className="profile-header-handle">{creator.handle}</div>
            <div className="profile-header-contact">
              <span className="row gap-1"><Mail size={13} /> {creator.email}</span>
              {creator.phone && <span className="row gap-1"><Phone size={13} /> {creator.phone}</span>}
              {creator.socials?.includes('instagram') && (
                <span className="social-icon ig-icon" title="Instagram">IG</span>
              )}
              {creator.socials?.includes('tiktok') && (
                <span className="social-icon tiktok-icon" title="TikTok">TT</span>
              )}
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
        </div>
      </header>

      <nav className="profile-tabs" role="tablist">
        {TABS.map((t) => {
          const count = t.id === 'campaigns' ? campaignCount : null;
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
        {tab === 'activity' && <ActivityTab creator={creator} focusNoteKey={focusNote} />}
        {tab === 'campaigns' && (
          <CampaignsTab creator={creator} onOpenAssign={() => setAssignOpen(true)} />
        )}
        {tab === 'preferences' && <PreferencesTab creator={creator} />}
      </div>

      {assignOpen && (
        <AssignToCampaign
          creator={creator}
          onClose={() => setAssignOpen(false)}
        />
      )}
      {nudgeOpen && (
        <SendNudge
          creator={creator}
          status={status}
          onClose={() => setNudgeOpen(false)}
        />
      )}
    </section>
  );
}
