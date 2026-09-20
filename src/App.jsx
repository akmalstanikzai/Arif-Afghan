import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import './App.css';
import Dashboard from './Dashboard';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = session ? 'Dashboard | Rice Factory' : 'Sign in | Rice Factory';
  }, [session]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let authChanged = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authChanged = true;
      if (active) { setSession(nextSession); setLoading(false); }
    });
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || authChanged) return;
      setSession(data.session);
      if (sessionError) setError('Your session could not be restored. Please sign in again.');
      setLoading(false);
    }).catch(() => {
      if (active && !authChanged) {
        setError('Unable to connect. Please check your connection and try again.');
        setLoading(false);
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function signIn(event) {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) setError(authError.message);
      else setPassword('');
    } catch { setError('Unable to connect. Please check your connection and try again.'); }
    finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signOut();
      if (authError) setError(authError.message);
    } catch { setError('Unable to sign out. Please try again.'); }
    finally { setBusy(false); }
  }

  if (!loading && session) {
    return <Dashboard user={session.user} onSignOut={signOut} busy={busy} error={error} />;
  }

  return (
    <main className="login-layout">
      <section className="brand-panel" aria-label="Rice Factory">
        <a className="brand" href="/"><span className="brand-mark" aria-hidden="true">✳</span> RICE FACTORY</a>
        <div className="brand-story">
          <span className="eyebrow">FROM GRAIN TO GROWTH</span>
          <h1>Good things<br />start with<br /><em>a single grain.</em></h1>
          <p>A dedicated space for the people behind every harvest. Welcome to your factory workspace.</p>
        </div>
        <div className="grain-art" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
        <div className="brand-footer"><span>Rooted in quality.</span><span>Built for every day.</span></div>
      </section>
      <section className="form-panel">
        <span className="portal-label"><span /> TEAM PORTAL</span>
        <div className="login-card">
          {loading ? <p role="status">Getting your workspace ready…</p> : <>
            <span className="eyebrow">YOUR DAILY OPERATIONS, TOGETHER</span>
            <h2>Welcome back.</h2>
            <p className="intro">Sign in to your Rice Factory account.</p>
            {!supabase && <p className="setup-message" role="status">One-time setup needed: add your Supabase project URL and publishable key to <code>.env.local</code>, then restart the app. See the README for instructions.</p>}
            <form onSubmit={signIn}>
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" autoComplete="username" placeholder="you@company.com" required value={email} onChange={event => setEmail(event.target.value)} disabled={busy} />
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} />
                <button type="button" className="show-password" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? 'Hide' : 'Show'}</button>
              </div>
              {error && <p className="error-message" role="alert">{error}</p>}
              <button className="primary-button" type="submit" disabled={busy || !supabase}>{busy ? 'Signing in…' : 'Sign in'}<span aria-hidden="true">→</span></button>
            </form>
            <p className="help-text">Need an account or password help?<br /><span>Contact your factory administrator.</span></p>
          </>}
        </div>
        <footer className="form-footer">RICE FACTORY <span>•</span> A little care in every grain.</footer>
      </section>
    </main>
  );
}
export default App;
