import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, ArrowRight, AlertCircle, Send, ChevronDown, ChevronRight, Plus, Users } from 'lucide-react';
import { useEventStore } from '../../store/useEventStore.jsx';
import {
  selectBrandPool, selectCreatorStatus, selectDaysInStage, shouldAutoArchive,
  selectCreatorScores, overallScoreColor,
} from '../../domain/selectors.js';
import { CAMPAIGN_TO_BRAND } from '../../domain/seed/brands.js';
import { useToast } from '../../components/Toast.jsx';
import Avatar from '../../components/Avatar.jsx';
import CreatorIdentity from '../../components/CreatorIdentity.jsx';
import Pill from '../../components/Pill.jsx';
import PortalStatusPill from '../../components/PortalStatusPill.jsx';
import ProfilePanel from '../Creators/ProfilePanel.jsx';
import BulkInviteDialog from './BulkInviteDialog.jsx';
import BulkAssignDialog from './BulkAssignDialog.jsx';
import BulkAssignToPoolDialog from './BulkAssignToPoolDialog.jsx';
import BrandPoolUploadDialog from './BrandPoolUploadDialog.jsx';
import ArchiveDialog from './ArchiveDialog.jsx';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'potential', label: 'Potential' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'archived', label: 'Archived' },
];

// Spec §6 ranking — lower number = sorted first
function rankFor(brandPoolStatus, portalStatus, scores) {
  if (brandPoolStatus === 'archived') return 6;
  if (portalStatus.kind === 'INVITED') return 4;
  if (brandPoolStatus === 'qualified' && scores.overall != null && scores.overall >= 7) return 1;
  if (brandPoolStatus === 'qualified') return 2; // qualified, no score yet
  if (portalStatus.kind === 'NOT_IN_PROGRAM') return 3;
  if (scores.overall != null && scores.overall < 6) return 5;
  return 3; // default: new + uninvited treated optimistically
}

const ARCHIVE_REASON_LABELS = {
  'timing': 'Timing',
  'not-a-fit': 'Not a fit',
  'not-open-to-gifted': 'Not open to gifted',
  'not-open-to-small-brands': 'Not open to small brands',
  'failed-onboarding': 'Failed onboarding',
  'other': 'Other',
};

export default function BrandPool() {
  const { brandId } = useParams();
  const { brands, creators, events, campaigns, appendEvent } = useEventStore();
  const toast = useToast();
  const brand = brands.find((b) => b.id === brandId);

  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [openProfile, setOpenProfile] = useState(null);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveExpanded, setArchiveExpanded] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignPoolOpen, setBulkAssignPoolOpen] = useState(false);

  // Pool members enriched with creator + portal status + brand-pool status + scores
  const enriched = useMemo(() => {
    const pool = selectBrandPool(events, brandId);
    return pool.map((entry) => {
      const creator = creators.find((c) => c.id === entry.creatorId);
      if (!creator) return null;
      const portalStatus = selectCreatorStatus(events, creator.id, campaigns);
      const days = selectDaysInStage(portalStatus);
      const scores = selectCreatorScores(events, creator.id);
      return {
        creator,
        portalStatus,
        days,
        brandPool: entry,
        scores,
        // Per-spec ranking
        rank: rankFor(entry.status, portalStatus, scores),
      };
    }).filter(Boolean);
  }, [events, brandId, creators, campaigns]);

  const counts = useMemo(() => {
    const acc = { all: enriched.length, potential: 0, confirmed: 0, qualified: 0, archived: 0 };
    for (const e of enriched) {
      if (e.brandPool.status === 'potential') acc.potential += 1;
      else if (e.brandPool.status === 'confirmed') acc.confirmed += 1;
      else if (e.brandPool.status === 'qualified') acc.qualified += 1;
      else if (e.brandPool.status === 'archived') acc.archived += 1;
    }
    return acc;
  }, [enriched]);

  // Filter + search + sort per spec ranking
  const visible = useMemo(() => {
    return enriched.filter((e) => {
      if (filter === 'all' && e.brandPool.status === 'archived') return false;
      if (filter !== 'all' && filter !== 'archived' && e.brandPool.status !== filter) return false;
      if (filter === 'archived' && e.brandPool.status !== 'archived') return false;
      if (query) {
        const q = query.toLowerCase();
        const c = e.creator;
        if (!(c.name?.toLowerCase().includes(q) || c.handle?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Primary: rank ascending (1 first)
      if (a.rank !== b.rank) return a.rank - b.rank;
      // Secondary: overall score descending (within rank)
      const oa = a.scores.overall ?? -1;
      const ob = b.scores.overall ?? -1;
      if (ob !== oa) return ob - oa;
      // Tertiary: most recent activity
      return (b.brandPool.since ?? '').localeCompare(a.brandPool.since ?? '');
    });
  }, [enriched, filter, query]);

  const archivedRows = useMemo(
    () => enriched.filter((e) => e.brandPool.status === 'archived'),
    [enriched],
  );

  // Pre-select gray rows by default (not in program) and within visible only
  const inviteEligible = useMemo(
    () => enriched.filter((e) => e.portalStatus.kind === 'NOT_IN_PROGRAM'),
    [enriched],
  );
  // Selection-derived eligibility: ops can bulk-assign Qualified creators to a campaign
  const selectedCreators = useMemo(
    () => enriched.filter((e) => selectedIds.has(e.creator.id)),
    [enriched, selectedIds],
  );
  const allSelectedQualified = selectedCreators.length > 0
    && selectedCreators.every((e) => e.brandPool.status === 'qualified');

  function toggleSelect(creatorId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(creatorId)) next.delete(creatorId);
      else next.add(creatorId);
      return next;
    });
  }
  function selectAllGray() {
    setSelectedIds(new Set(inviteEligible.map((e) => e.creator.id)));
  }
  function clearSelection() { setSelectedIds(new Set()); }

  function confirm(creatorId) {
    appendEvent({
      type: 'BRAND_POOL_CONFIRMED',
      creatorId,
      brandId,
      actor: { kind: 'ops', name: 'Julia' },
    });
    toast(`Confirmed for ${brand.name} — preferences reviewed`);
  }
  function qualify(creatorId) {
    appendEvent({
      type: 'BRAND_POOL_QUALIFIED',
      creatorId,
      brandId,
      actor: { kind: 'ops', name: 'Julia' },
    });
    toast(`Qualified for ${brand.name}`);
  }
  function unarchive(creatorId) {
    appendEvent({
      type: 'BRAND_POOL_UNARCHIVED',
      creatorId,
      brandId,
      actor: { kind: 'ops', name: 'Julia' },
    });
    toast('Unarchived — back to Potential');
  }

  if (!brand) return null;

  return (
    <div className="brand-pool-page">
      <header className="bp-header">
        <div>
          <p className="muted micro">Brand Pool · {brand.name}</p>
          <h2 className="bp-title">Pool</h2>
        </div>
        <div className="row gap-2">
          <button type="button" className="btn secondary" onClick={() => setUploadOpen(true)}>
            <Upload size={14} /> Upload to Pool
          </button>
        </div>
      </header>

      <div className="bp-controls">
        <input
          className="input search"
          type="search"
          placeholder="Search by name, handle, or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="chip-row" style={{ marginTop: 12 }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`chip ${filter === f.id ? 'active' : ''}`}
              onClick={() => {
                setFilter(f.id);
                if (f.id === 'archived') setArchiveExpanded(true);
              }}
            >
              {f.label} <span className="count">{counts[f.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar — sticky at top of list when selection present */}
      <div className="bp-bulk-bar">
        <div className="row gap-3">
          {inviteEligible.length > 0 && (
            <button
              type="button"
              className="btn ghost small"
              onClick={selectedIds.size === inviteEligible.length ? clearSelection : selectAllGray}
            >
              {selectedIds.size === inviteEligible.length ? 'Clear selection' : `Select all "Not in Program" (${inviteEligible.length})`}
            </button>
          )}
          <span className="muted small">
            {selectedIds.size} selected
          </span>
        </div>
        <div className="row gap-2">
          <button
            type="button"
            className="btn secondary small"
            disabled={selectedIds.size === 0 || !inviteEligible.some((e) => selectedIds.has(e.creator.id))}
            onClick={() => setBulkInviteOpen(true)}
            title="Send portal invites to all selected 'Not in Program' creators"
          >
            <Send size={13} /> Invite ({selectedCreators.filter((e) => e.portalStatus.kind === 'NOT_IN_PROGRAM').length})
          </button>
          <button
            type="button"
            className="btn secondary small"
            disabled={selectedIds.size === 0}
            onClick={() => setBulkAssignPoolOpen(true)}
            title="Add all selected to another brand's pool"
          >
            <Users size={13} /> Assign to Pool ({selectedIds.size})
          </button>
          <button
            type="button"
            className="btn primary small"
            disabled={!allSelectedQualified}
            onClick={() => setBulkAssignOpen(true)}
            title={allSelectedQualified
              ? 'Assign all selected to a campaign'
              : 'Bulk-assign requires all selected creators to be Qualified'}
          >
            <Plus size={13} /> Assign to Campaign ({selectedIds.size})
          </button>
        </div>
      </div>
      {selectedIds.size > 0 && !allSelectedQualified && selectedCreators.some((e) => e.brandPool.status !== 'qualified') && (
        <div className="muted small" style={{ marginTop: -8, marginBottom: 8 }}>
          Tip: only Qualified creators can be bulk-assigned to a campaign.
        </div>
      )}

      <div className="bp-table">
        <div className="bp-row bp-row-header">
          <span className="bp-col-checkbox" />
          <span>Creator</span>
          <span>Portal status</span>
          <span>Brand pool</span>
          <span />
        </div>

        {filter !== 'archived' && visible.length === 0 && (
          <div className="bp-empty">No creators match.</div>
        )}

        {filter !== 'archived' && visible.map(({ creator, portalStatus, days, brandPool }) => {
          const isGray = portalStatus.kind === 'NOT_IN_PROGRAM';
          const autoArchiveCandidate = shouldAutoArchive(portalStatus);
          return (
            <div key={creator.id} className={`bp-row ${autoArchiveCandidate ? 'auto-archive-flag' : ''}`}>
              <span className="bp-col-checkbox">
                <input
                  type="checkbox"
                  checked={selectedIds.has(creator.id)}
                  onChange={() => toggleSelect(creator.id)}
                  aria-label={`Select ${creator.name}`}
                />
              </span>
              <button
                type="button"
                className="bp-creator-cell"
                onClick={() => setOpenProfile(creator.id)}
              >
                {(() => {
                  const e = enriched.find((x) => x.creator.id === creator.id);
                  const declines = events.filter((ev) =>
                    ev.creatorId === creator.id && ev.type === 'CAMPAIGN_DECLINED',
                  );
                  const past = declines.find((d) => d.campaignId && CAMPAIGN_TO_BRAND[d.campaignId] === brandId);
                  const extras = (
                    <>
                      {e?.scores.overall != null && (
                        <span className={`overall-score-pill small tone-${overallScoreColor(e.scores.overall)}`}
                          title={e.scores.overallMode === 'composite'
                            ? `R ${e.scores.reliability?.toFixed(1)} · Q ${e.scores.quality?.toFixed(1)}`
                            : 'Reliability only'}>
                          {e.scores.overall.toFixed(1)}
                        </span>
                      )}
                      {e?.scores.overall == null && e?.scores.isNew && (
                        <span className="overall-score-pill small tone-gray">New</span>
                      )}
                      {past && (
                        <span className="past-decline-flag" title={`Declined: ${past.payload?.reason ?? 'no reason'}`}>
                          <AlertCircle size={11} /> Past decline
                        </span>
                      )}
                    </>
                  );
                  return <CreatorIdentity creator={creator} compact rightOfName={extras} />;
                })()}
              </button>
              <span>
                <PortalStatusPill status={portalStatus} />
                {portalStatus.kind === 'INVITED' && (
                  <span className={`bp-days ${days.days >= 4 ? 'late' : ''}`}>
                    {days.days >= 4 && <AlertCircle size={12} />} {days.days}d
                  </span>
                )}
              </span>
              <span>
                {brandPool.status === 'qualified' && (
                  <Pill color="green" title={`Confirmed fit for ${brand.name}: socials reviewed, onboarding answers reviewed, ready to be assigned to a campaign`}>Qualified</Pill>
                )}
                {brandPool.status === 'confirmed' && (
                  <Pill color="blue" title={`Preferences reviewed for ${brand.name}; awaiting full vetting / AI card before assigning`}>Confirmed</Pill>
                )}
                {brandPool.status === 'potential' && (
                  <Pill color="purple" title={`In ${brand.name} pool but not yet reviewed — Katie/Des hasn't checked their socials or onboarding answers for ${brand.name} fit`}>Potential</Pill>
                )}
              </span>
              <span className="bp-row-actions">
                {brandPool.status === 'potential' && (
                  <button type="button" className="btn ghost small" onClick={() => confirm(creator.id)}>
                    Confirm
                  </button>
                )}
                {brandPool.status === 'confirmed' && (
                  <button type="button" className="btn ghost small" onClick={() => qualify(creator.id)}>
                    Qualify
                  </button>
                )}
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => setArchiveTarget(creator)}
                  title="Archive from this brand"
                >
                  Archive
                </button>
                <button
                  type="button"
                  className="btn ghost icon-only"
                  onClick={() => setOpenProfile(creator.id)}
                  aria-label="Open profile"
                >
                  <ArrowRight size={14} />
                </button>
              </span>
            </div>
          );
        })}

        {/* Expandable archived section — always at bottom unless filter==archived */}
        {filter !== 'archived' && archivedRows.length > 0 && (
          <div className={`bp-archive-section ${archiveExpanded ? 'expanded' : ''}`}>
            <button
              type="button"
              className="bp-archive-toggle"
              onClick={() => setArchiveExpanded((v) => !v)}
            >
              {archiveExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Archived ({archivedRows.length})
            </button>
            {archiveExpanded && archivedRows.map(({ creator, portalStatus, brandPool }) => (
              <div key={creator.id} className="bp-row archived">
                <span className="bp-col-checkbox" />
                <button type="button" className="bp-creator-cell" onClick={() => setOpenProfile(creator.id)}>
                  <CreatorIdentity creator={creator} compact />
                </button>
                <span><PortalStatusPill status={portalStatus} /></span>
                <span>
                  <Pill color="gray">Archived · {ARCHIVE_REASON_LABELS[brandPool.archiveReason] ?? 'Other'}</Pill>
                  {brandPool.archiveNote && <div className="muted small" style={{ marginTop: 4 }}>{brandPool.archiveNote}</div>}
                </span>
                <span className="bp-row-actions">
                  <button type="button" className="btn ghost small" onClick={() => unarchive(creator.id)}>
                    Unarchive
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* When filter === 'archived', show flat */}
        {filter === 'archived' && archivedRows.map(({ creator, portalStatus, brandPool }) => (
          <div key={creator.id} className="bp-row archived">
            <span className="bp-col-checkbox" />
            <button type="button" className="bp-creator-cell" onClick={() => setOpenProfile(creator.id)}>
              <Avatar creator={creator} size={32} />
              <span>
                <span className="bp-creator-name">{creator.name}</span>
                <span className="bp-creator-handle">{creator.handle}</span>
              </span>
            </button>
            <span><Pill color={portalStatus.color}>{portalStatus.label}</Pill></span>
            <span>
              <Pill color="gray">Archived · {ARCHIVE_REASON_LABELS[brandPool.archiveReason] ?? 'Other'}</Pill>
              {brandPool.archiveNote && <div className="muted small" style={{ marginTop: 4 }}>{brandPool.archiveNote}</div>}
            </span>
            <span className="bp-row-actions">
              <button type="button" className="btn ghost small" onClick={() => unarchive(creator.id)}>
                Unarchive
              </button>
            </span>
          </div>
        ))}

        {filter === 'archived' && archivedRows.length === 0 && (
          <div className="bp-empty">No archived creators.</div>
        )}
      </div>

      {openProfile && (
        <div className="profile-modal-backdrop"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenProfile(null); }}>
          <div className="profile-modal">
            <ProfilePanel
              entry={(() => {
                const e = enriched.find((x) => x.creator.id === openProfile);
                if (!e) return null;
                return {
                  creator: e.creator,
                  status: e.portalStatus,
                  activeCampaignCount: 0,
                };
              })()}
              onClose={() => setOpenProfile(null)}
            />
          </div>
        </div>
      )}

      {bulkInviteOpen && (
        <BulkInviteDialog
          brand={brand}
          creators={inviteEligible.filter((e) => selectedIds.has(e.creator.id)).map((e) => e.creator)}
          onClose={() => setBulkInviteOpen(false)}
          onSent={(creatorList) => {
            for (const c of creatorList) {
              appendEvent({
                type: 'PORTAL_INVITE_SENT',
                creatorId: c.id,
                brandId,
                actor: { kind: 'ops', name: 'Julia' },
                payload: { batchSize: creatorList.length, brandId },
              });
            }
            toast(`Sent ${creatorList.length} portal invite${creatorList.length === 1 ? '' : 's'}`);
            setBulkInviteOpen(false);
            clearSelection();
          }}
        />
      )}

      {uploadOpen && (
        <BrandPoolUploadDialog
          brand={brand}
          onClose={() => setUploadOpen(false)}
        />
      )}

      {bulkAssignOpen && (
        <BulkAssignDialog
          brand={brand}
          creators={selectedCreators.map((e) => e.creator)}
          onClose={() => setBulkAssignOpen(false)}
          onAssigned={() => {
            setBulkAssignOpen(false);
            clearSelection();
          }}
        />
      )}

      {bulkAssignPoolOpen && (
        <BulkAssignToPoolDialog
          sourceBrand={brand}
          creators={selectedCreators.map((e) => e.creator)}
          onClose={() => setBulkAssignPoolOpen(false)}
          onAssigned={() => {
            setBulkAssignPoolOpen(false);
            clearSelection();
          }}
        />
      )}

      {archiveTarget && (
        <ArchiveDialog
          brand={brand}
          creator={archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onConfirm={({ reason, note }) => {
            appendEvent({
              type: 'BRAND_POOL_ARCHIVED',
              creatorId: archiveTarget.id,
              brandId,
              actor: { kind: 'ops', name: 'Julia' },
              payload: { reason, note },
            });
            toast(`Archived ${archiveTarget.name} from ${brand.name}`);
            setArchiveTarget(null);
          }}
        />
      )}
    </div>
  );
}
