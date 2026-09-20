import { useState } from 'react';
import './Dashboard.css';

function Icon({ name, ...props }) {
  const paths = {
    home: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
    logout: <><path d="M9 4H4v16h5M10 12h11m-4-4 4 4-4 4" /></>,
    leaf: <><path d="M20 4C9 2 3 7 5 15c8 5 16-1 15-11ZM4 21 15 10" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

export default function Dashboard({ user, onSignOut, busy, error }) {
  const [page, setPage] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'there';
  const initial = name.charAt(0).toUpperCase();

  function navigate(nextPage) { setPage(nextPage); setMenuOpen(false); }

  return (
    <div className="dashboard-shell">
      <aside className={`dashboard-sidebar${menuOpen ? ' is-open' : ''}`}>
        <a className="brand dashboard-brand" href="/" aria-label="Rice Factory home"><span className="brand-mark" aria-hidden="true">✳</span><span>RICE FACTORY<small>TEAM WORKSPACE</small></span></a>
        <div className="workspace-label">WORKSPACE</div>
        <nav id="dashboard-navigation" aria-label="Main navigation">
          <button aria-current={page === 'overview' ? 'page' : undefined} onClick={() => navigate('overview')}><Icon name="home" />Overview</button>
          <button aria-current={page === 'account' ? 'page' : undefined} onClick={() => navigate('account')}><Icon name="user" />My account</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><Icon name="leaf" /><p>A little care.<br /><strong>In every grain.</strong></p></div>
          <div className="sidebar-user"><span className="user-avatar">{initial}</span><div><strong>{name}</strong><span>{user.email}</span></div></div>
          <button className="signout-button" onClick={onSignOut} disabled={busy}><Icon name="logout" />{busy ? 'Signing out…' : 'Sign out'}</button>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-heading"><button className="sidebar-toggle" aria-label="Toggle navigation" aria-controls="dashboard-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" /></button><span>Workspace <span className="breadcrumb-divider">/</span> <strong>{page === 'overview' ? 'Overview' : 'My account'}</strong></span></div>
          <span className="header-avatar" aria-label={`Signed in as ${name}`}>{initial}</span>
        </header>
        <main className="dashboard-content" id="main-content">
          {error && <p className="error-message" role="alert">{error}</p>}
          {page === 'overview' ? <>
            <div className="dashboard-page-heading"><div><span className="eyebrow">YOUR WORKSPACE AT A GLANCE</span><h1>Overview</h1></div><time dateTime={new Date().toISOString().slice(0, 10)}>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</time></div>
            <section className="dashboard-welcome">
              <div><span className="welcome-tag"><span /> YOU’RE ALL SET</span><h2>Welcome, {name}.</h2><p>It’s good to have you here. This is your space to keep your factory’s day moving.</p><span className="welcome-signature">Rooted in quality. Ready for what’s next.</span></div>
              <div className="welcome-art" aria-hidden="true"><Icon name="leaf" width="120" height="120" /></div>
            </section>
            <section className="workspace-empty"><span className="empty-icon"><Icon name="home" width="25" height="25" /></span><h2>A fresh start for your factory.</h2><p>Your dashboard is ready. As factory features are added, your operations and updates will appear here.</p><button onClick={() => navigate('account')}>View my account <span aria-hidden="true">→</span></button></section>
            <footer className="dashboard-footer">Rice Factory <span>Your everyday workspace.</span></footer>
          </> : <>
            <div className="dashboard-page-heading"><div><span className="eyebrow">YOUR WORKSPACE PROFILE</span><h1>My account</h1></div></div>
            <section className="account-card"><span className="account-avatar">{initial}</span><h2>{name}</h2><p>Your signed-in account details.</p><dl><div><dt>Email address</dt><dd>{user.email || 'Not provided'}</dd></div><div><dt>Account created</dt><dd>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Not available'}</dd></div></dl><p className="account-help">For account changes or password help, contact your factory administrator.</p></section>
          </>}
        </main>
      </div>
    </div>
  );
}
