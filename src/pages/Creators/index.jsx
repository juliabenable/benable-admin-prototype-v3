import { useMemo, useState } from 'react';
import { Upload, UserPlus, RotateCcw } from 'lucide-react';
import { useEventStore } from '../../store/useEventStore.jsx';
import {
  selectCreatorStatus, selectDaysInStage, selectCreatorCampaigns,
  rosterFilterMatches, searchMatches, selectAllTags, AUTO_TAG_RULES, selectBrandPool,
} from '../../domain/selectors.js';
import RosterList from './RosterList.jsx';
import ProfilePanel from './ProfilePanel.jsx';
import UploadDialog from './UploadDialog.jsx';
import './creators.css';

const FILTERS = [
  { id: 'all',          label: 'All' },
  { id: 'in-portal',    label: 'In Portal' },
  { id: 'invited',      label: 'Invited' },
  { id: 'in-campaign',  label: 'In Campaign' },
  { id: 'no-campaign',  label: 'No Campaign' },
];

export default function Creators() {
  const { creators, events, campaigns, brands, resetDemo } = useEventStore();
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Per-brand pools, computed once
  const brandPoolsById = useMemo(() => {
    const out = new Map();
    for (const b of brands ?? []) {
      const pool = selectBrandPool(events, b.id);
      out.set(b.id, pool);
    }
    return out;
  }, [brands, events]);

  // Compute derived state for every creator once per render.
  const enriched = useMemo(() => {
    return creators.map((creator) => {
      const status = selectCreatorStatus(events, creator.id, campaigns);
      const days = selectDaysInStage(status);
      const camps = selectCreatorCampaigns(events, creator.id, campaigns);
      const liveCampaign = camps.find((c) => c.campaign.status === 'live'
        && c.stage !== 'NONE' && c.stage !== 'DECLINED');
      const tags = selectAllTags(creator);
      // Count brand pools this creator appears in (excluding archived)
      let brandPoolCount = 0;
      for (const pool of brandPoolsById.values()) {
        const found = pool.find((p) => p.creatorId === creator.id);
        if (found && found.status !== 'archived') brandPoolCount += 1;
      }
      return {
        creator,
        status,
        daysInStage: days.days,
        stalled: days.stalled,
        liveCampaign: liveCampaign?.campaign ?? null,
        hasAnyCampaign: camps.length > 0,
        activeCampaignCount: camps.filter((c) => c.campaign.status === 'live' && c.stage !== 'DECLINED').length,
        tags,
        brandPoolCount,
      };
    });
  }, [creators, events, campaigns, brandPoolsById]);

  const counts = useMemo(() => {
    const acc = { all: enriched.length, 'in-portal': 0, invited: 0, 'in-campaign': 0, 'no-campaign': 0 };
    for (const e of enriched) {
      if (e.status.kind === 'IN_PORTAL') acc['in-portal'] += 1;
      else if (e.status.kind === 'INVITED') acc.invited += 1;
      else if (e.status.kind === 'IN_CAMPAIGN') acc['in-campaign'] += 1;
      else acc['no-campaign'] += 1;
    }
    return acc;
  }, [enriched]);

  const filtered = useMemo(() => {
    return enriched
      .filter((e) => rosterFilterMatches(filter, e.status))
      .filter((e) => searchMatches(query, e.creator))
      .filter((e) => activeTag ? e.tags.includes(activeTag) : true)
      .sort((a, b) => {
        const ta = a.status.since ?? '';
        const tb = b.status.since ?? '';
        return tb.localeCompare(ta);
      });
  }, [enriched, filter, query, activeTag]);

  // Tag counts for chips
  const tagCounts = useMemo(() => {
    const counts = {};
    for (const e of enriched) {
      for (const t of e.tags) counts[t] = (counts[t] ?? 0) + 1;
    }
    return counts;
  }, [enriched]);

  const selected = enriched.find((e) => e.creator.id === selectedId) ?? null;

  function handleReset() {
    if (window.confirm('This will clear all your changes and restore the demo to its starting state. Continue?')) {
      resetDemo();
      setSelectedId(null);
    }
  }

  return (
    <div className="creators-page">
      <header className="creators-header">
        <div className="creators-title">
          <h1>Creators</h1>
          <span className="muted">{enriched.length} total</span>
        </div>
        <div className="row gap-2">
          <button type="button" className="btn ghost small" onClick={handleReset} title="Reset demo to starting state">
            <RotateCcw size={14} /> Reset demo
          </button>
          <button type="button" className="btn secondary" onClick={() => setUploadOpen(true)}>
            <Upload size={14} /> Upload
          </button>
          <button type="button" className="btn primary">
            <UserPlus size={14} /> Add Creator
          </button>
        </div>
      </header>

      <div className="creators-body">
        <RosterList
          entries={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
          filter={filter}
          setFilter={setFilter}
          query={query}
          setQuery={setQuery}
          filters={FILTERS}
          counts={counts}
          activeTag={activeTag}
          setActiveTag={setActiveTag}
          tagCounts={tagCounts}
          tagRules={AUTO_TAG_RULES}
        />
      </div>

      {selected && (
        <div
          className="profile-modal-backdrop"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
        >
          <div className="profile-modal">
            <ProfilePanel entry={selected} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      )}

      {uploadOpen && <UploadDialog onClose={() => setUploadOpen(false)} />}
    </div>
  );
}
