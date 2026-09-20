import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import LoginPage from '../features/auth/pages/LoginPage';
import OverviewPage from '../features/dashboard/pages/OverviewPage';
import AccountPage from '../features/account/pages/AccountPage';
import DashboardLayout from '../layouts/DashboardLayout';

function AuthenticatedApp({ user, signOut, busy, error }) {
  const [page, setPage] = useState('overview');

  return (
    <DashboardLayout user={user} page={page} onNavigate={setPage} onSignOut={signOut} busy={busy} error={error}>
      {page === 'account'
        ? <AccountPage user={user} />
        : <OverviewPage user={user} onViewAccount={() => setPage('account')} />}
    </DashboardLayout>
  );
}

export default function App() {
  const auth = useAuth();

  useEffect(() => {
    document.title = auth.session ? 'Dashboard | Rice Factory' : 'Sign in | Rice Factory';
  }, [auth.session]);

  if (!auth.loading && auth.session) {
    return <AuthenticatedApp key={auth.session.user.id} user={auth.session.user} {...auth} />;
  }

  return <LoginPage loading={auth.loading} busy={auth.busy} error={auth.error} onSignIn={auth.signIn} configured={auth.configured} />;
}
