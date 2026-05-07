import { NavLink, Outlet } from 'react-router-dom';
import TopTabs from '../shell/TopTabs.jsx';
import './creator-program.css';

const SUB_TABS = [
  { label: 'Creators',           to: '/admin/creator-program/creators' },
  { label: 'Campaign Templates', to: '/admin/creator-program/templates' },
  { label: 'Campaign Preselection', to: '/admin/creator-program/preselection' },
  { label: 'Campaigns',          to: '/admin/creator-program/campaigns' },
];

export default function CreatorProgram() {
  return (
    <div className="creator-program">
      <TopTabs />
      <div className="cp-subtab-row">
        {SUB_TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => `cp-subtab ${isActive ? 'active' : ''}`}
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
