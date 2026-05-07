import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, Plus, AlertCircle, ChevronRight } from 'lucide-react';
import { useEventStore } from '../../store/useEventStore.jsx';
import {
  selectBrandPool, selectCreatorStatus, selectCreatorCampaigns,
  scoreBriefFit,
} from '../../domain/selectors.js';
import { useToast } from '../../components/Toast.jsx';
import Avatar from '../../components/Avatar.jsx';
import Pill from '../../components/Pill.jsx';
import RelativeTime from '../../components/RelativeTime.jsx';
import BriefCheckPanel from './BriefCheckPanel.jsx';

const STATUS_PILL = {
  live: { label: 'Live', color: 'green' },
  draft: { label: 'Draft', color: 'gray' },
  completed: { label: 'Completed', color: 'purple' },
};

// Sample brief data per existing campaign — for the brief check demo
const BRIEFS = {
  camp_western_cozy: {
    name: 'The Western Cozy Set',
    categories: ['Lifestyle', 'Home', 'Fashion'],
    platforms: ['instagram', 'tiktok'],
    gifted: true,
    vertical: 'cozy',
  },
  camp_summer_mom: {
    name: 'Summer Mom Drop',
    categories: ['Motherhood', 'Family', 'Lifestyle'],
    platforms: ['instagram'],
    gifted: true,
    vertical: 'mom',
  },
  camp_glow_edit: {
    name: 'Glow Edit',
    categories: ['Beauty', 'Skincare'],
    platforms: ['instagram', 'tiktok'],
    gifted: true,
    vertical: 'beauty',
  },
};

export default function BrandCampaigns() {
  const { brandId } = useParams();
  const { brands, campaigns, events, creators, appendEvent } = useEventStore();
  const toast = useToast();
  const brand = brands.find((b) => b.id === brandId);
  const [briefCheckOpen, setBriefCheckOpen] = useState(null); // campaignId

  const brandCampaigns = useMemo(
    () => campaigns.filter((c) => c.brandHandle === brand?.handle),
    [campaigns, brand],
  );

  const active = brandCampaigns.filter((c) => c.status === 'live' || c.status === 'draft');
  const completed = brandCampaigns.filter((c) => c.status === 'completed');

  // Per-campaign stats: count creators in each stage
  function campaignStats(campaignId) {
    const allCreatorEvents = events.filter((e) => e.campaignId === campaignId);
    const creatorIds = new Set(allCreatorEvents.map((e) => e.creatorId));
    let accepted = 0, declined = 0, contentLive = 0, brandRejected = 0;
    for (const cId of creatorIds) {
      const cs = selectCreatorCampaigns(events, cId, campaigns).find((x) => x.campaign.id === campaignId);
      if (!cs) continue;
      if (cs.stage === 'CONTENT_LIVE') contentLive += 1;
      else if (cs.stage === 'CONTENT_APPROVED') accepted += 1;
      else if (cs.stage === 'ACCEPTED' || cs.stage === 'PRODUCTS_SELECTED' || cs.stage === 'ORDER_PLACED' || cs.stage === 'PRODUCT_SHIPPED' || cs.stage === 'DELIVERED' || cs.stage === 'CONTENT_SUBMITTED') accepted += 1;
      if (cs.stage === 'DECLINED') declined += 1;
      if (cs.brandDecision === 'REJECTED') brandRejected += 1;
    }
    return { total: creatorIds.size, accepted, declined, contentLive, brandRejected };
  }

  if (!brand) return null;

  return (
    <div className="brand-campaigns-page">
      <header className="bp-header">
        <div>
          <p className="muted micro">Brand · {brand.name}</p>
          <h2 className="bp-title">Campaigns</h2>
        </div>
      </header>

      {active.length === 0 && completed.length === 0 ? (
        <div className="tab-empty">No campaigns yet for this brand.</div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="brand-campaigns-section">
              <h3>Active</h3>
              <div className="brand-campaign-grid">
                {active.map((c) => {
                  const stats = campaignStats(c.id);
                  const needsAttention = stats.declined >= 5 || stats.brandRejected >= 3;
                  const status = STATUS_PILL[c.status];
                  return (
                    <div key={c.id} className={`brand-campaign-card ${needsAttention ? 'needs-attention' : ''}`}>
                      {needsAttention && (
                        <div className="brand-campaign-alert">
                          <AlertCircle size={14} /> Needs attention
                        </div>
                      )}
                      <div className="brand-campaign-card-head">
                        <h4>{c.name}</h4>
                        <Pill color={status.color}>{status.label}</Pill>
                      </div>
                      <div className="brand-campaign-stats">
                        <div className="brand-campaign-stat"><span className="num">{stats.total}</span><span className="label">creators</span></div>
                        <div className="brand-campaign-stat"><span className="num">{stats.accepted}</span><span className="label">accepted</span></div>
                        <div className="brand-campaign-stat"><span className="num">{stats.contentLive}</span><span className="label">content live</span></div>
                        <div className="brand-campaign-stat"><span className="num">{stats.declined + stats.brandRejected}</span><span className="label">declined/rejected</span></div>
                      </div>
                      <div className="brand-campaign-actions">
                        {BRIEFS[c.id] && (
                          <button
                            type="button"
                            className="btn secondary small"
                            onClick={() => setBriefCheckOpen(c.id)}
                          >
                            <Sparkles size={13} /> Run brief check
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className="brand-campaigns-section">
              <h3>Completed</h3>
              <div className="brand-campaign-grid">
                {completed.map((c) => {
                  const stats = campaignStats(c.id);
                  return (
                    <div key={c.id} className="brand-campaign-card completed">
                      <div className="brand-campaign-card-head">
                        <h4>{c.name}</h4>
                        <Pill color="purple">Completed</Pill>
                      </div>
                      <div className="brand-campaign-stats">
                        <div className="brand-campaign-stat"><span className="num">{stats.total}</span><span className="label">creators</span></div>
                        <div className="brand-campaign-stat"><span className="num">{stats.contentLive}</span><span className="label">content live</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {briefCheckOpen && (
        <BriefCheckPanel
          campaign={brandCampaigns.find((c) => c.id === briefCheckOpen)}
          brief={BRIEFS[briefCheckOpen]}
          brand={brand}
          onClose={() => setBriefCheckOpen(null)}
        />
      )}
    </div>
  );
}
