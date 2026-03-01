import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Briefcase, Zap, Download, Settings, LogOut, Menu, X
} from 'lucide-react';
import { clearSession } from '../../lib/auth.js';
import { cx } from '../../lib/utils.js';

const nav = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/deltagare',    icon: Users,            label: 'Deltagare' },
  { to: '/rekryterare',  icon: Briefcase,        label: 'Rekryterare' },
  { to: '/matchning',    icon: Zap,              label: 'Matchning' },
  { to: '/export',       icon: Download,         label: 'Export' },
  { to: '/installningar',icon: Settings,         label: 'Inställningar' },
];

function NavItem({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-[var(--accent-light)] text-[var(--accent-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
        )
      }
      title={collapsed ? label : undefined}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();
    navigate('/');
  }

  return (
    <aside
      className={cx(
        'flex flex-col bg-[var(--bg-white)] border-r border-[var(--border)] h-full transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
        {!collapsed && (
          <span className="font-display text-lg text-[var(--text-primary)]">CoachMatch</span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-colors ml-auto"
          aria-label="Växla sidopanel"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {nav.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-[var(--border)]">
        <button
          onClick={handleLogout}
          className={cx(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            'text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50'
          )}
          title={collapsed ? 'Logga ut' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logga ut</span>}
        </button>
      </div>
    </aside>
  );
}
