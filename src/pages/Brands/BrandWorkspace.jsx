import { NavLink, Outlet, useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useEventStore } from '../../store/useEventStore.jsx';
import { selectBrandPool } from '../../domain/selectors.js';
import BrandLogo from './BrandLogo.jsx';

export default function BrandWorkspace() {
  const { brandId } = useParams();
  const { brands, events, campaigns } = useEventStore();
  const brand = brands.find((b) => b.id === brandId);

  if (!brand) {
    return (
      <div style={{ padding: 32 }}>
        <p>Brand not found.</p>
        <Link to="/admin/brands" className="btn ghost small"><ChevronLeft size={14} /> Back to brands</Link>
      </div>
    );
  }

  const pool = selectBrandPool(events, brand.id);
  const poolCount = pool.filter((p) => p.status !== 'archived').length;
  const brandCampaigns = campaigns.filter((c) => c.brandHandle === brand.handle);
  const activeCount = brandCampaigns.filter((c) => c.status === 'live' || c.status === 'draft').length;

  const TABS = [
    { label: `Pool (${poolCount})`, to: `/admin/brands/${brand.id}/pool` },
    { label: `Campaigns (${activeCount})`, to: `/admin/brands/${brand.id}/campaigns` },
    { label: 'About', to: `/admin/brands/${brand.id}/about` },
    { label: 'Comms', to: `/admin/brands/${brand.id}/comms` },
  ];

  return (
    <div className="brand-workspace">
      <header className="brand-workspace-header">
        <Link to="/admin/brands" className="brand-back-link">
          <ChevronLeft size={14} /> All brands
        </Link>
        <div className="brand-workspace-title">
          <BrandLogo brand={brand} size={40} />
          <div>
            <h1>{brand.name}</h1>
            <div className="muted small">
              {brand.handle} · {brand.relationshipType}
              {brand.agency ? ` (${brand.agency})` : ''}
            </div>
          </div>
        </div>
      </header>

      <nav className="brand-tab-row">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => `brand-tab ${isActive ? 'active' : ''}`}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
