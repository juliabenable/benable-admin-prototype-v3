import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EventStoreProvider } from './store/useEventStore.jsx';
import { ToastProvider } from './components/Toast.jsx';
import Shell from './shell/Shell.jsx';
import CreatorProgram from './pages/CreatorProgram.jsx';
import Creators from './pages/Creators/index.jsx';
import BrandsLayout from './pages/Brands/BrandsLayout.jsx';
import BrandsList from './pages/Brands/BrandsList.jsx';
import BrandWorkspace from './pages/Brands/BrandWorkspace.jsx';
import BrandPool from './pages/Brands/BrandPool.jsx';
import BrandAbout from './pages/Brands/BrandAbout.jsx';
import BrandCampaigns from './pages/Brands/BrandCampaigns.jsx';
import BrandComms from './pages/Brands/BrandComms.jsx';
import Placeholder from './pages/Placeholder.jsx';

export default function App() {
  return (
    <HashRouter>
      <EventStoreProvider>
        <ToastProvider>
          <Shell>
            <Routes>
              <Route path="/" element={<Navigate to="/admin/brands" replace />} />
              <Route path="/admin" element={<Navigate to="/admin/brands" replace />} />

              <Route path="/admin/creator-program" element={<Navigate to="/admin/creator-program/creators" replace />} />
              <Route element={<CreatorProgram />}>
                <Route path="/admin/creator-program/creators" element={<Creators />} />
                <Route path="/admin/creator-program/templates" element={<Placeholder title="Campaign Templates" />} />
                <Route path="/admin/creator-program/preselection" element={<Placeholder title="Campaign Preselection" />} />
                <Route path="/admin/creator-program/campaigns" element={<Placeholder title="Campaigns" />} />
              </Route>

              <Route element={<BrandsLayout />}>
                <Route path="/admin/brands" element={<BrandsList />} />
                <Route element={<BrandWorkspace />}>
                  <Route path="/admin/brands/:brandId" element={<Navigate to="pool" replace />} />
                  <Route path="/admin/brands/:brandId/pool" element={<BrandPool />} />
                  <Route path="/admin/brands/:brandId/campaigns" element={<BrandCampaigns />} />
                  <Route path="/admin/brands/:brandId/about" element={<BrandAbout />} />
                  <Route path="/admin/brands/:brandId/comms" element={<BrandComms />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/admin/brands" replace />} />
            </Routes>
          </Shell>
        </ToastProvider>
      </EventStoreProvider>
    </HashRouter>
  );
}
