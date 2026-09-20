import { useState } from 'react';
import Sidebar from '../components/navigation/Sidebar';
import Icon from '../components/ui/Icon';
import Alert from '../components/ui/Alert';
import { getUserDisplayName } from '../lib/user';

export default function DashboardLayout({ user, page, onNavigate, onSignOut, busy, error, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const name = getUserDisplayName(user);

  function navigate(nextPage) {
    onNavigate(nextPage);
    setMenuOpen(false);
  }

  return (
    <div className="flex min-h-svh flex-col bg-surface text-sm text-ink md:flex-row">
      <Sidebar user={user} page={page} open={menuOpen} onNavigate={navigate} onSignOut={onSignOut} busy={busy} />
      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-line bg-white px-4 md:h-[83px] md:px-7 lg:px-10">
          <div className="flex items-center gap-3 text-xs text-[#94998f]">
            <button className="inline-flex cursor-pointer p-2 text-brand md:hidden" aria-label="Toggle navigation" aria-controls="dashboard-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" /></button>
            <span>Workspace <span className="mx-3.5 text-[#c6cbbf]">/</span> <strong className="font-medium text-[#3c4c3e]">{page === 'overview' ? 'Overview' : 'My account'}</strong></span>
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#edf0e6] text-xs font-semibold text-[#526a46]" aria-label={`Signed in as ${name}`}>{name.charAt(0).toUpperCase()}</span>
        </header>
        <main className="mx-auto max-w-[1320px] px-5 py-7 md:px-7 lg:px-10 lg:pt-10" id="main-content">
          <Alert>{error}</Alert>
          {children}
        </main>
      </div>
    </div>
  );
}
