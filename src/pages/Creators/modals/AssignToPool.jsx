import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from '../../../components/Modal.jsx';
import { useEventStore } from '../../../store/useEventStore.jsx';
import { useToast } from '../../../components/Toast.jsx';
import { selectCreatorBrandPools } from '../../../domain/selectors.js';
import { EVENT_TYPES as E } from '../../../domain/events.js';
import BrandLogo from '../../Brands/BrandLogo.jsx';

const STATUS_LABEL = {
  qualified: 'Qualified',
  confirmed: 'Confirmed',
  potential: 'Potential',
  archived: 'Archived',
};

export default function AssignToPool({ creator, onClose }) {
  const { brands, events, appendEvent } = useEventStore();
  const toast = useToast();

  // Existing pool memberships (incl. archived) so we can mark already-in
  const existing = useMemo(
    () => new Map(selectCreatorBrandPools(events, creator.id, brands).map((m) => [m.brand.id, m.status])),
    [events, creator.id, brands],
  );

  // Pre-select the first brand the creator is NOT already actively in
  const firstAvailable = brands.find((b) => {
    const s = existing.get(b.id);
    return !s || s === 'archived';
  });
  const [brandId, setBrandId] = useState(firstAvailable?.id ?? brands[0]?.id ?? '');

  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedStatus = existing.get(brandId);
  const isArchived = selectedStatus === 'archived';
  const isAlreadyActive = selectedStatus && selectedStatus !== 'archived';

  function submit() {
    if (!brandId) return;
    if (isArchived) {
      appendEvent({
        type: E.BRAND_POOL_UNARCHIVED,
        creatorId: creator.id,
        brandId,
        actor: { kind: 'ops', name: 'Julia' },
      });
      toast(`${creator.name} unarchived from ${selectedBrand?.name} pool`);
    } else {
      appendEvent({
        type: E.BRAND_POOL_ADDED,
        creatorId: creator.id,
        brandId,
        actor: { kind: 'ops', name: 'Julia' },
        payload: { source: 'profile-assign' },
      });
      toast(`Added ${creator.name} to ${selectedBrand?.name} pool`);
    }
    onClose?.();
  }

  return (
    <Modal
      title={`Assign ${creator.name} to a brand pool`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn primary"
            onClick={submit}
            disabled={!brandId || isAlreadyActive}
          >
            <Plus size={14} />
            {isArchived ? ' Unarchive' : ' Add to pool'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="muted small" style={{ margin: 0 }}>
          Adds {creator.name} to the brand's pool as <strong>Potential</strong>. They stay in any
          campaigns or other pools they're already part of.
        </p>

        <div className="assign-pool-list">
          {brands.map((b) => {
            const status = existing.get(b.id);
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
                  <div className="muted small">{b.handle}</div>
                </div>
                {status && (
                  <span className={`assign-pool-status ${status}`}>
                    Already {STATUS_LABEL[status]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isAlreadyActive && (
          <p className="muted small" style={{ margin: 0 }}>
            {creator.name} is already <strong>{STATUS_LABEL[selectedStatus]}</strong> for {selectedBrand?.name}. Pick a different brand.
          </p>
        )}
        {isArchived && (
          <p className="muted small" style={{ margin: 0 }}>
            {creator.name} was previously archived from {selectedBrand?.name}. Confirming will unarchive them.
          </p>
        )}
      </div>
    </Modal>
  );
}
