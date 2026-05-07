import { Outlet } from 'react-router-dom';
import TopTabs from '../../shell/TopTabs.jsx';
import './brands.css';

export default function BrandsLayout() {
  return (
    <div className="brands-page">
      <TopTabs />
      <Outlet />
    </div>
  );
}
