import { useState } from 'react';
import Sidebar from '../components/navigation/Sidebar';
import Icon from '../components/ui/Icon';
import Alert from '../components/ui/Alert';
import { navigation } from '../lib/format';
import { getUserDisplayName } from '../lib/user';
import { useLanguage } from '../lib/i18n';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';

export default function DashboardLayout({ user, page, onNavigate, onSignOut, busy, error, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const name = getUserDisplayName(user);
  const { t, direction } = useLanguage();

  function navigate(nextPage) {
    onNavigate(nextPage);
    setMenuOpen(false);
  }

  return (
    <div className="flex min-h-svh flex-col bg-surface text-sm text-ink md:flex-row" dir="ltr">
      <Sidebar user={user} page={page} open={menuOpen} onNavigate={navigate} onSignOut={onSignOut} busy={busy} />
      <div className="min-w-0 flex-1" dir={direction}>
        <header className="flex h-16 items-center justify-between gap-3 border-b border-line bg-white px-4 md:h-[83px] md:px-7 lg:px-10">
          <div className="flex items-center gap-3 text-xs text-[#94998f]">
            <button className="inline-flex cursor-pointer p-2 text-brand md:hidden" aria-label={t('باز و بسته کردن فهرست')} aria-controls="dashboard-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" /></button>
            <span>{t('کارخانه')} <span className="mx-3.5 text-[#c6cbbf]">/</span> <strong className="font-medium text-[#3c4c3e]">{t(navigation.find(item => item.id === page)?.label || '')}</strong></span>
          </div>
          <div className="flex items-center gap-3" dir="ltr"><LanguageSwitcher className="rounded-md border border-line bg-white px-2.5 py-1.5 text-[11px] text-brand" /><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#edf0e6] text-xs font-semibold text-[#526a46]" aria-label={`${t('واردشده با نام')} ${name}`}>{name.charAt(0).toUpperCase()}</span></div>
        </header>
        <main className="mx-auto max-w-[1320px] px-5 py-7 md:px-7 lg:px-10 lg:pt-10" id="main-content">
          <Alert>{error}</Alert>
          {children}
        </main>
      </div>
    </div>
  );
}
