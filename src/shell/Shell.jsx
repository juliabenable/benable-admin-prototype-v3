import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import './shell.css';

export default function Shell({ children }) {
  return (
    <div className="shell">
      <Sidebar />
      <div className="shell-main">
        <TopBar />
        <div className="shell-content">{children}</div>
      </div>
    </div>
  );
}
