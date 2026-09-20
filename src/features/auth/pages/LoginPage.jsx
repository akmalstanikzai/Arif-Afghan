import { useState } from 'react';
import Alert from '../../../components/ui/Alert';
import LoginBrandPanel from '../components/LoginBrandPanel';
import { useLanguage } from '../../../lib/i18n';
import LanguageSwitcher from '../../../components/ui/LanguageSwitcher';

const inputClass = 'h-[51px] w-full rounded-lg border border-[#dcded5] bg-[#fffefa] px-4 text-[13px] text-brand placeholder:text-[#9b9f94]';

export default function LoginPage({ loading, busy, error, onSignIn, configured }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const { t, direction } = useLanguage();

  async function handleSubmit(event) {
    event.preventDefault();
    setValidationError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password) {
      setValidationError('ایمیل معتبر و رمز عبور را وارد کنید.');
      return;
    }
    if (await onSignIn({ email, password })) setPassword('');
  }

  return (
    <main className="grid min-h-svh bg-[#faf9f6] text-brand sm:grid-cols-2" dir="ltr">
      <LoginBrandPanel />
      <section dir={direction} className="flex flex-col items-center p-7 sm:p-9 lg:px-12 lg:pt-12 lg:pb-8">
        <div className="flex w-full items-center justify-between gap-3"><span className="flex items-center gap-2 text-[10px] leading-7 text-[#778178]"><span className="size-1.5 rounded-full bg-[#6f8d66]" /> {t('ورود کارمندان')}</span><LanguageSwitcher className="rounded-md border border-line bg-white px-2.5 py-1.5 text-[11px] text-brand" /></div>
        <div className="my-auto w-full max-w-[380px] py-10 sm:py-18">
          {loading ? <p role="status">{t('در حال آماده‌سازی حساب…')}</p> : <>
            <span className="text-[9px] font-bold leading-7 text-[#7c866f]">{t('مدیریت یک‌جای کارهای روزانه')}</span>
            <h2 className="mt-4 mb-3 font-display text-[32px] leading-relaxed lg:text-[38px]">{t('خوش آمدید.')}</h2>
            <p className="mb-9 text-sm leading-relaxed text-[#7a8077]">{t('به حساب کارخانهٔ برنج وارد شوید.')}</p>
            {!configured && <p className="mb-6 rounded-lg bg-[#f2eddb] p-3.5 text-xs leading-relaxed text-[#736135]" role="status">{t('اتصال سیستم هنوز تنظیم نشده است. برای تکمیل راه‌اندازی با مدیر سیستم تماس بگیرید.')}</p>}
            <form onSubmit={handleSubmit} noValidate>
              <label className="mb-2.5 block text-xs font-semibold" htmlFor="email">{t('آدرس ایمیل')}</label>
              <input className={`${inputClass} mb-6`} id="email" dir="ltr" type="email" autoComplete="username" placeholder="you@company.com" required value={email} onChange={event => setEmail(event.target.value)} disabled={busy} />
              <label className="mb-2.5 block text-xs font-semibold" htmlFor="password">{t('رمز عبور')}</label>
              <div className="relative">
                <input className={`${inputClass} pe-16`} id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder={t('رمز عبور را وارد کنید')} required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} />
                <button type="button" className="absolute top-1 end-1 h-[43px] cursor-pointer px-3 text-[11px] text-[#66775f]" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t('پنهان') : t('نمایش')} aria-pressed={showPassword}>{showPassword ? t('پنهان') : t('نمایش')}</button>
              </div>
              <Alert>{validationError || error}</Alert>
              <button className="mt-7 flex min-h-[51px] w-full cursor-pointer items-center justify-center gap-4 rounded-lg bg-brand-action px-5 py-3.5 text-[13px] font-semibold text-[#fffef6] transition-colors hover:bg-[#326048] disabled:cursor-not-allowed disabled:opacity-55" type="submit" disabled={busy || !configured}>{busy ? t('در حال ورود…') : t('ورود')}<span aria-hidden="true">→</span></button>
            </form>
            <p className="mt-8 text-center text-xs leading-[1.9] text-[#8a8e82]">{t('برای حساب یا رمز عبور کمک می‌خواهید؟')}<br /><span className="text-[#53694f]">{t('با مدیر کارخانه تماس بگیرید.')}</span></p>
          </>}
        </div>
        <footer className="text-center text-[9px] tracking-wider text-[#929789]">{t('کارخانهٔ برنج')} <span className="px-2.5">•</span> {t('دقت در هر دانه.')}</footer>
      </section>
    </main>
  );
}
