import { NavLink, useLocation } from 'react-router-dom';
import {
  Plus, Filter, Heart, User, FileText, Users, Code, Star,
  List, Flame, MessageSquare, HelpCircle, UserPlus,
  Compass, Flag, Link as LinkIcon, DollarSign
} from 'lucide-react';

const SIDEBAR_ITEMS = [
  { icon: Plus,         label: 'Categories' },
  { icon: Filter,       label: 'Rec Processing' },
  { icon: Heart,        label: 'Recommendations' },
  { icon: User,         label: 'Users & Invites' },
  { icon: FileText,     label: 'Event Schemas' },
  { icon: Users,        label: 'User Types' },
  { icon: Code,         label: 'Invite codes' },
  { icon: Star,         label: 'Interested Users' },
  { icon: List,         label: 'Lists' },
  { icon: Flame,        label: 'Top Obsessions' },
  { icon: MessageSquare,label: 'Comments' },
  { icon: HelpCircle,   label: 'Rec Requests' },
  { icon: UserPlus,     label: 'Rec Request Groups' },
  { icon: Compass,      label: 'Discover' },
  { icon: Flag,         label: 'Feature Flags' },
  { icon: LinkIcon,     label: 'URL Formats' },
  { icon: DollarSign,   label: 'Payouts' },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  // Active when we're inside Creator Program (the only routed area).
  const creatorProgramActive = pathname.startsWith('/admin/creator-program');

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Benable</div>
      <nav className="sidebar-nav">
        {SIDEBAR_ITEMS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            className="sidebar-item inert"
            tabIndex={-1}
            aria-disabled="true"
            title={label}
          >
            <Icon size={18} strokeWidth={1.75} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
