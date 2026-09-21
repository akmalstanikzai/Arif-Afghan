import OngoingProcessesPage from '../pages/OngoingProcessesPage.jsx';
import RawInventoryPage from '../pages/RawInventoryPage.jsx';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import LoginPage from '../pages/LoginPage.jsx';
import OverviewPage from '../pages/OverviewPage.jsx';
import AccountPage from '../pages/AccountPage.jsx';
import PurchasesPage from '../pages/PurchasesPage.jsx';
import ProcessingPage from '../pages/ProcessingPage.jsx';
import SalesPage from '../pages/SalesPage.jsx';
import PartiesPage from '../pages/PartiesPage.jsx';
import ExpensesPage from '../pages/ExpensesPage.jsx';
import MonthlyExpensesPage from '../pages/MonthlyExpensesPage.jsx';
import StaffSalariesPage from '../pages/StaffSalariesPage.jsx';
import ExpenseDashboardPage from '../pages/ExpenseDashboardPage.jsx';
import InventoryPage from '../pages/InventoryPage.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { useFactory } from '../hooks/useFactory.js';
import { FactoryProvider } from '../providers/FactoryProvider.jsx';
import Alert from '../components/Alert.jsx';
import { secondaryClass } from '../components/Fields.jsx';
import { useLanguage } from '../hooks/useLanguage';

function Workspace({ user, signOut, busy, error }) {
  const [page, setPage] = useState('overview');
  const { data, error: dataError, refresh, refreshing } = useFactory();
  const { t } = useLanguage();
  const databaseReady = Array.isArray(data?.packaged_stock) && Array.isArray(data?.ongoing_processes);
  const pages = {
    overview: <OverviewPage user={user} onNavigate={setPage} />,
    purchases: <PurchasesPage />, suppliers: <PartiesPage kind="supplier" />,
    processing: <ProcessingPage onStarted={()=>setPage('ongoing')} />, service: <ProcessingPage service onStarted={()=>setPage('ongoing')} />,
    ongoing: <OngoingProcessesPage />, raw_inventory: <RawInventoryPage />, inventory: <InventoryPage />, sales: <SalesPage />, customers: <PartiesPage kind="customer" />,
    expense_dashboard: <ExpenseDashboardPage />, daily_expenses: <ExpensesPage />, monthly_expenses: <MonthlyExpensesPage />, staff_salaries: <StaffSalariesPage />, account: <AccountPage user={user} />,
  };
  return <DashboardLayout user={user} page={page} onNavigate={setPage} onSignOut={signOut} busy={busy} error={error}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-stone-500">{t("Currency: Afghan afghani · Weight: kilograms · Dates: Gregorian / Solar Hijri")}</p><button className={secondaryClass} disabled={refreshing} onClick={refresh}>{refreshing ? t("Refreshing…") : t("Refresh data")}</button></div>
    <Alert>{dataError}</Alert>{dataError && <p className="mb-5 text-xs leading-7 text-stone-500">{t("If this is a new setup, an administrator must run the database migrations and enable staff access. Existing data may take a moment to appear.")}</p>}
    {data && !databaseReady && page !== 'account' ? <Alert>{t("Apply database migration 005, then refresh to use the updated system.")}</Alert> : page === 'account' || data ? <div key={page}>{pages[page]}</div> : !dataError && <p role="status" className="p-10 text-center text-stone-500">{t("Loading factory data…")}</p>}
  </DashboardLayout>;
}
export default function App() {
  const auth = useAuth();
  const { t } = useLanguage();
  useEffect(() => { document.title = auth.session ? t("Factory management") : `${t("Sign in")} | ${t("Rice Factory")}`; }, [auth.session, t]);
  if (!auth.loading && auth.session) return <FactoryProvider key={auth.session.user.id}><Workspace user={auth.session.user} {...auth} /></FactoryProvider>;
  return <LoginPage loading={auth.loading} busy={auth.busy} error={auth.error} onSignIn={auth.signIn} configured={auth.configured} />;
}
