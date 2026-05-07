import { Menu } from 'lucide-react';

export default function TopBar() {
  return (
    <header className="topbar">
      <button type="button" className="topbar-hamburger" aria-label="Toggle menu" tabIndex={-1}>
        <Menu size={20} strokeWidth={1.75} />
      </button>
      <div className="spacer" />
      <div className="topbar-user">
        <div className="topbar-user-avatar">
          <div className="avatar size-32">JG</div>
        </div>
        <div className="topbar-user-meta">
          <div className="topbar-user-email">julia@benable.com</div>
          <div className="topbar-user-name">Julia Guillemot</div>
        </div>
      </div>
    </header>
  );
}
