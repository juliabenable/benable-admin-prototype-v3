import { NavLink } from 'react-router-dom';

const TOP_TABS = [
  { label: 'Creator Program', to: '/admin/creator-program' },
  { label: 'Campaigns', to: null },
  { label: 'Brands', to: '/admin/brands' },
  { label: 'Discovery', to: null },
  { label: 'AI Testing', to: null },
];

export default function TopTabs() {
  return (
    <div className="cp-tab-row">
      {TOP_TABS.map((t) =>
        t.to ? (
          <NavLink
            key={t.label}
            to={t.to}
            className={({ isActive }) => `cp-tab ${isActive ? 'active' : ''}`}
          >
            {t.label}
          </NavLink>
        ) : (
          <span key={t.label} className="cp-tab inert">{t.label}</span>
        ),
      )}
    </div>
  );
}
