import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import { useEventStore } from '../../store/useEventStore.jsx';
import { useToast } from '../../components/Toast.jsx';
import { selectBrandPoolStatus } from '../../domain/selectors.js';
import { EVENT_TYPES as E } from '../../domain/events.js';
import BrandLogo from './BrandLogo.jsx';

/**
 * Bulk-add selected creators to ANOTHER brand's pool. Per Katie's
 * "split. And then from there, I can move them to a different brand."
 *
 * Doesn't remove them from the current brand pool — additive, just like
 * the per-creator AssignToPool flow.
 */
export default function BulkAssignToPoolDialog({ sourceBrand, creators, onClose, onAssigned }) {
  const { brands, events, appendEvent } = useEventStore();
  const toast = useToast();

  // Eligible brands: any brand other than the current one
  const otherBrands = brands.filter((b) => b.id !== sourceBrand.id);
  const [brandId, setBrandId] = useState(otherBrands[0]?.id ?? '');

  // Per-brand: how many of the selected creators are already in that pool?
  const breakdown = useMemo(() => {
    const map = new Map();
    for (const b of otherBrands) {
      let alreadyIn = 0;
      let archived = 0;
      for (const c of creators) {
        const status = selectBrandPoolStatus(events, c.id, b.id);
        if (!status) continue;
        if (status.status === 'archived') archived += 1;
        else alreadyIn += 1;
      }
      map.set(b.id, { alreadyIn, archived, willAdd: creators.length - alreadyIn - archived });
    }
    return map;
  }, [otherBrands, creators, events]);

  const selectedBrand = otherBrands.find((b) => b.id === brandId);
  const selectedBreakdown = breakdown.get(brandId) ?? { alreadyIn: 0, archived: 0, willAdd: 0 };

  function submit() {
    if (!brandId) return;
    let added = 0;
    let unarchived = 0;
    for (const c of creators) {
      const status = selectBrandPoolStatus(events, c.id, brandId);
      if (status?.status && status.status !== 'archived') continue; // already active in pool
      if (status?.status === 'archived') {
        appendEvent({
          type: E.BRAND_POOL_UNARCHIVED,
          creatorId: c.id, brandId,
          actor: { kind: 'ops', name: 'Julia' },
        });
        unarchived += 1;
      } else {
        appendEvent({
          type: E.BRAND_POOL_ADDED,
          creatorId: c.id, brandId,
          actor: { kind: 'ops', name: 'Julia' },
          payload: { source: 'bulk-pool-assign-from-' + sourceBrand.id },
        });
        added += 1;
      }
    }
    const total = added + unarchived;
    toast(`Added ${total} to ${selectedBrand?.name} pool${unarchived > 0 ? ` (${unarchived} unarchived)` : ''}`);
    onAssigned?.(total);
  }

  return (
    <Modal
      title={`Add ${creators.length} creator${creators.length === 1 ? '' : 's'} to another brand's pool`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn primary"
            onClick={submit}
            disabled={!brandId || selectedBreakdown.willAdd + selectedBreakdown.archived === 0}
          >
            <Plus size={14} /> Add {selectedBreakdown.willAdd + selectedBreakdown.archived}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="muted small" style={{ margin: 0 }}>
          Adds the selected creators to the chosen brand's pool as <strong>Potential</strong>. They stay in {sourceBrand.name}'s pool — this is additive, not a move.
        </p>

        <div className="assign-pool-list">
          {otherBrands.map((b) => {
            const counts = breakdown.get(b.id) ?? { alreadyIn: 0, archived: 0, willAdd: 0 };
            const active = b.id === brandId;
            return (
              <button
                key={b.id}
                type="button"
                className={`assign-pool-row ${active ? 'active' : ''}`}
                onClick={() => setBrandId(b.id)}
              >
                <BrandLogo brand={b} size={32} />
                <div className="assign-pool-row-meta">
                  <div className="assign-pool-row-name">{b.name}</div>
                  <div className="muted small">
                    {counts.willAdd > 0 && `${counts.willAdd} new`}
                    {counts.willAdd > 0 && counts.alreadyIn > 0 && ' · '}
                    {counts.alreadyIn > 0 && `${counts.alreadyIn} already in pool`}
                    {counts.archived > 0 && ` · ${counts.archived} archived (will unarchive)`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <details className="bulk-assign-list">
          <summary className="muted small">Selected creators ({creators.length})</summary>
          <ul>
            {creators.map((c) => (
              <li key={c.id}>{c.name} <span className="muted small">{c.handle}</span></li>
            ))}
          </ul>
        </details>
      </div>
    </Modal>
  );
}
