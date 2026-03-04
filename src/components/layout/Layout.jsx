import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

const PAGE_TITLES = {
  '/dashboard':    'Dashboard',
  '/deltagare':    'Deltagare',
  '/rekryterare':  'Rekryterare',
  '/matchning':    'Matchning',
  '/jobbfokus':   'Jobb Fokus',
  '/export':       'Export',
  '/installningar':'Inställningar',
};

export default function Layout({ children }) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Stäng mobil-meny vid navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const title = PAGE_TITLES[location.pathname] ?? 'CoachMatch';

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      {/* Mobil overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-content mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
