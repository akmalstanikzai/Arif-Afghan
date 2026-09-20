import { useState } from 'react';
import Alert from '../../../components/ui/Alert';
import LoginBrandPanel from '../components/LoginBrandPanel';

const inputClass = 'h-[51px] w-full rounded-lg border border-[#dcded5] bg-[#fffefa] px-4 text-[13px] text-brand placeholder:text-[#9b9f94]';

export default function LoginPage({ loading, busy, error, onSignIn, configured }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (await onSignIn({ email, password })) setPassword('');
  }

  return (
    <main className="grid min-h-svh bg-[#faf9f6] text-brand sm:grid-cols-2">
      <LoginBrandPanel />
      <section className="flex flex-col items-center p-7 sm:p-9 lg:px-12 lg:pt-12 lg:pb-8">
        <span className="flex items-center gap-2 self-end text-[10px] tracking-[2px] text-[#778178]"><span className="size-1.5 rounded-full bg-[#6f8d66]" /> TEAM PORTAL</span>
        <div className="my-auto w-full max-w-[380px] py-10 sm:py-18">
          {loading ? <p role="status">Getting your workspace ready…</p> : <>
            <span className="text-[9px] font-bold tracking-[2px] text-[#7c866f]">YOUR DAILY OPERATIONS, TOGETHER</span>
            <h2 className="mt-4 mb-3 font-display text-[38px] leading-tight tracking-tight lg:text-[43px]">Welcome back.</h2>
            <p className="mb-9 text-sm leading-relaxed text-[#7a8077]">Sign in to your Rice Factory account.</p>
            {!configured && <p className="mb-6 rounded-lg bg-[#f2eddb] p-3.5 text-xs leading-relaxed text-[#736135]" role="status">One-time setup needed: add your Supabase project URL and publishable key to <code>.env.local</code>, then restart the app. See the README for instructions.</p>}
            <form onSubmit={handleSubmit}>
              <label className="mb-2.5 block text-xs font-semibold" htmlFor="email">Email address</label>
              <input className={`${inputClass} mb-6`} id="email" type="email" autoComplete="username" placeholder="you@company.com" required value={email} onChange={event => setEmail(event.target.value)} disabled={busy} />
              <label className="mb-2.5 block text-xs font-semibold" htmlFor="password">Password</label>
              <div className="relative">
                <input className={`${inputClass} pr-16`} id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} />
                <button type="button" className="absolute top-1 right-1 h-[43px] cursor-pointer px-3 text-[11px] text-[#66775f]" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? 'Hide' : 'Show'}</button>
              </div>
              <Alert>{error}</Alert>
              <button className="mt-7 flex min-h-[51px] w-full cursor-pointer items-center justify-center gap-4 rounded-lg bg-brand-action px-5 py-3.5 text-[13px] font-semibold text-[#fffef6] transition-colors hover:bg-[#326048] disabled:cursor-not-allowed disabled:opacity-55" type="submit" disabled={busy || !configured}>{busy ? 'Signing in…' : 'Sign in'}<span aria-hidden="true">→</span></button>
            </form>
            <p className="mt-8 text-center text-xs leading-[1.9] text-[#8a8e82]">Need an account or password help?<br /><span className="text-[#53694f]">Contact your factory administrator.</span></p>
          </>}
        </div>
        <footer className="text-center text-[9px] tracking-wider text-[#929789]">RICE FACTORY <span className="px-2.5">•</span> A little care in every grain.</footer>
      </section>
    </main>
  );
}
