import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useEventStore } from '../../store/useEventStore.jsx';
import { selectBrandPool } from '../../domain/selectors.js';
import Pill from '../../components/Pill.jsx';
import BrandLogo from './BrandLogo.jsx';

function brandActivity(brand, campaigns) {
  const own = campaigns.filter((c) => c.brandHandle === brand.handle);
  const live = own.filter((c) => c.status === 'live').length;
  const draft = own.filter((c) => c.status === 'draft').length;
  const completed = own.filter((c) => c.status === 'completed').length;
  if (live > 0) return { kind: 'live', label: `${live} live`, color: 'green' };
  if (draft > 0) return { kind: 'draft', label: `${draft} draft`, color: 'blue' };
  if (completed > 0) return { kind: 'quiet', label: `${completed} completed`, color: 'gray' };
  return { kind: 'none', label: 'No campaigns yet', color: 'gray' };
}

export default function BrandsList() {
  const { brands, events, campaigns } = useEventStore();

  const enriched = useMemo(() => brands.map((brand) => {
    const pool = selectBrandPool(events, brand.id);
    const potential = pool.filter((p) => p.status === 'potential').length;
    const qualified = pool.filter((p) => p.status === 'qualified').length;
    const own = campaigns.filter((c) => c.brandHandle === brand.handle);
    const liveCount = own.filter((c) => c.status === 'live').length;
    const draftCount = own.filter((c) => c.status === 'draft').length;
    const activity = brandActivity(brand, campaigns);
    return {
      brand, pool, potential, qualified, liveCount, draftCount, activity,
    };
  }), [brands, events, campaigns]);

  const active = enriched.filter((e) => e.activity.kind === 'live' || e.activity.kind === 'draft');
  const quiet = enriched.filter((e) => e.activity.kind === 'quiet' || e.activity.kind === 'none');

  return (
    <div className="brands-list-page">
      <header className="brands-list-header">
        <h1>Brands</h1>
        <span className="muted">
          {active.length} active · {quiet.length} quiet
        </span>
      </header>

      {active.length > 0 && (
        <section className="brands-section">
          <h2 className="brands-section-title">Active</h2>
          <ul className="brands-list">
            {active.map((e) => <BrandRow key={e.brand.id} {...e} />)}
          </ul>
        </section>
      )}

      {quiet.length > 0 && (
        <section className="brands-section">
          <h2 className="brands-section-title">Quiet</h2>
          <ul className="brands-list">
            {quiet.map((e) => <BrandRow key={e.brand.id} {...e} />)}
          </ul>
        </section>
      )}
    </div>
  );
}

function BrandRow({ brand, pool, potential, qualified, liveCount, draftCount, activity }) {
  return (
    <li className={`brand-card ${activity.kind === 'live' ? 'is-live' : ''}`}>
      <Link to={`/admin/brands/${brand.id}/pool`} className="brand-card-link">
        <BrandLogo brand={brand} size={48} />
        <div className="brand-card-body">
          <div className="brand-card-name-row">
            <h2>{brand.name}</h2>
            <span className="brand-card-handle">{brand.handle}</span>
            <Pill color={activity.color}>{activity.label}</Pill>
          </div>
          <div className="brand-card-desc">{brand.description}</div>
          <div className="brand-card-stats">
            <div className="brand-card-stat">
              <span className="brand-card-stat-num">{pool.length}</span>
              <span className="brand-card-stat-label">in pool</span>
            </div>
            <div className="brand-card-stat">
              <span className="brand-card-stat-num">{qualified}</span>
              <span className="brand-card-stat-label">qualified</span>
            </div>
            <div className="brand-card-stat">
              <span className="brand-card-stat-num">{potential}</span>
              <span className="brand-card-stat-label">potential</span>
            </div>
            <div className="brand-card-stat">
              <span className="brand-card-stat-num">{liveCount}</span>
              <span className="brand-card-stat-label">live campaigns</span>
            </div>
            {draftCount > 0 && (
              <div className="brand-card-stat">
                <span className="brand-card-stat-num">{draftCount}</span>
                <span className="brand-card-stat-label">draft</span>
              </div>
            )}
          </div>
        </div>
        <div className="brand-card-arrow"><ArrowRight size={18} /></div>
      </Link>
    </li>
  );
}
