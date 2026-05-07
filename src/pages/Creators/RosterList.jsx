import { ChevronRight, AlertCircle, Tag as TagIcon } from 'lucide-react';
import Avatar from '../../components/Avatar.jsx';
import CreatorIdentity from '../../components/CreatorIdentity.jsx';
import Pill from '../../components/Pill.jsx';

function formatFollowers(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export default function RosterList({
  entries, onSelect, selectedId, filter, setFilter, query, setQuery, filters, counts,
  activeTag, setActiveTag, tagCounts = {}, tagRules = [],
}) {
  return (
    <div className="roster-list">
      <div className="roster-controls">
        <input
          className="input search"
          type="search"
          placeholder="Search by name, handle, or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="chip-row" style={{ marginTop: 12 }}>
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`chip ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label} <span className="count">{counts[f.id] ?? 0}</span>
            </button>
          ))}
        </div>
        {tagRules.length > 0 && (
          <div className="row gap-2 tag-row">
            <span className="muted small tag-row-label"><TagIcon size={11} /> Tags:</span>
            <div className="chip-row">
              {tagRules.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`chip tag-chip ${activeTag === r.id ? 'active' : ''}`}
                  onClick={() => setActiveTag(activeTag === r.id ? null : r.id)}
                  title={`Auto-applied to creators matching: ${r.label}`}
                >
                  {r.label} <span className="count">{tagCounts[r.id] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="roster-table" role="table">
        <div className="roster-row roster-row-header" role="row">
          <span role="columnheader">Creator</span>
          <span role="columnheader">Portal status</span>
          <span role="columnheader">Tags</span>
          <span role="columnheader">In brand pools</span>
          <span role="columnheader" />
        </div>
        {entries.length === 0 ? (
          <div className="roster-empty">No creators match your filters.</div>
        ) : entries.map(({ creator, status, daysInStage, stalled, tags, brandPoolCount }) => (
          <button
            key={creator.id}
            type="button"
            className={`roster-row ${creator.id === selectedId ? 'selected' : ''}`}
            onClick={() => onSelect(creator.id)}
          >
            <span className="roster-creator">
              <CreatorIdentity
                creator={creator}
                size={40}
                rightOfName={
                  <span className="roster-creator-followers muted small">· {formatFollowers(creator.followerCount)}</span>
                }
              />
            </span>
            <span>
              <Pill color={status.color}>{status.label}</Pill>
              {stalled && status.kind === 'INVITED' && (
                <span className="roster-days stalled" style={{ marginLeft: 6 }}>
                  <AlertCircle size={12} /> {daysInStage}d
                </span>
              )}
            </span>
            <span className="roster-tags-cell">
              {tags.length === 0 ? <span className="muted small">—</span> : tags.slice(0, 3).map((t) => (
                <span key={t} className="tag-mini">{t.replace(/-/g, ' ')}</span>
              ))}
              {tags.length > 3 && <span className="muted small">+{tags.length - 3}</span>}
            </span>
            <span>
              {brandPoolCount > 0 ? (
                <span className="brand-pool-count">{brandPoolCount} pool{brandPoolCount === 1 ? '' : 's'}</span>
              ) : <span className="muted">—</span>}
            </span>
            <span className="roster-arrow"><ChevronRight size={16} /></span>
          </button>
        ))}
      </div>
    </div>
  );
}
