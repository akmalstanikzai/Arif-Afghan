import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import LoginPage from '../features/auth/pages/LoginPage';
import OverviewPage from '../features/dashboard/pages/OverviewPage';
import AccountPage from '../features/account/pages/AccountPage';
import PurchasesPage from '../features/purchases/pages/PurchasesPage';
import ProcessingPage from '../features/processing/pages/ProcessingPage';
import SalesPage from '../features/sales/pages/SalesPage';
import PartiesPage from '../features/parties/pages/PartiesPage';
import ExpensesPage from '../features/expenses/pages/ExpensesPage';
import InventoryPage from '../features/inventory/pages/InventoryPage';
import DashboardLayout from '../layouts/DashboardLayout';
import { useFactory } from '../features/factory/hooks/useFactory';
import { FactoryProvider } from '../features/factory/components/FactoryProvider';
import Alert from '../components/ui/Alert';
import { secondaryClass } from '../components/ui/Fields';
import { useLanguage } from '../lib/i18n';

function Workspace({ user, signOut, busy, error }) {
  const [page, setPage] = useState('overview');
  const { data, error: dataError, refresh, refreshing } = useFactory();
  const { t } = useLanguage();
  const pages = {
    overview: <OverviewPage user={user} onNavigate={setPage} />,
    purchases: <PurchasesPage />, suppliers: <PartiesPage kind="supplier" />,
    processing: <ProcessingPage />, service: <ProcessingPage service />,
    inventory: <InventoryPage />, sales: <SalesPage />, customers: <PartiesPage kind="customer" />,
    expenses: <ExpensesPage />, account: <AccountPage user={user} />,
  };
  return <DashboardLayout user={user} page={page} onNavigate={setPage} onSignOut={signOut} busy={busy} error={error}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-stone-500">{t('واحد پول: افغانی · وزن: کیلوگرام · تاریخ ثبت: میلادی')}</p><button className={secondaryClass} disabled={refreshing} onClick={refresh}>{refreshing ? t('در حال تازه‌سازی…') : t('تازه‌سازی اطلاعات')}</button></div>
    <Alert>{dataError}</Alert>{dataError && <p className="mb-5 text-xs leading-7 text-stone-500">{t('اگر راه‌اندازی تازه است، مدیر باید مهاجرت‌های دیتابیس را اجرا کند و دسترسی کارمند را فعال سازد. در صورت وجود اطلاعات قبلی، ممکن است نمایش آن تازه نباشد.')}</p>}
    {page === 'account' || data ? <div key={page}>{pages[page]}</div> : !dataError && <p role="status" className="p-10 text-center text-stone-500">{t('در حال دریافت اطلاعات کارخانه…')}</p>}
  </DashboardLayout>;
}
export default function App() {
  const auth = useAuth();
  const { t } = useLanguage();
  useEffect(() => { document.title = auth.session ? t('مدیریت کارخانه') : `${t('ورود')} | ${t('کارخانهٔ برنج')}`; }, [auth.session, t]);
  if (!auth.loading && auth.session) return <FactoryProvider key={auth.session.user.id}><Workspace user={auth.session.user} {...auth} /></FactoryProvider>;
  return <LoginPage loading={auth.loading} busy={auth.busy} error={auth.error} onSignIn={auth.signIn} configured={auth.configured} />;
}
