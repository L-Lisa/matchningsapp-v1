import { Menu } from 'lucide-react';
import { getSession } from '../../lib/auth.js';

export default function Header({ onMenuClick, title }) {
  const session = getSession();

  return (
    <header className="h-14 bg-[var(--bg-white)] border-b border-[var(--border)] flex items-center px-4 gap-4">
      {/* Hamburger för mobil */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
        aria-label="Öppna meny"
      >
        <Menu className="w-5 h-5" />
      </button>

      <h1 className="font-display text-xl text-[var(--text-primary)] flex-1">{title}</h1>

      {session?.name && (
        <span className="text-sm text-[var(--text-muted)] hidden sm:block">
          {session.name}
        </span>
      )}
    </header>
  );
}
