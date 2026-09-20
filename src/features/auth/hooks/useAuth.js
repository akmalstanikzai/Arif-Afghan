import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase/client';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let authChanged = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authChanged = true;
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || authChanged) return;
      setSession(data.session);
      if (sessionError) setError('نشست شما بازیابی نشد. لطفاً دوباره وارد شوید.');
      setLoading(false);
    }).catch(() => {
      if (active && !authChanged) {
        setError('ارتباط برقرار نشد. اتصال انترنت را بررسی کرده و دوباره کوشش کنید.');
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn({ email, password }) {
    if (!supabase || busy) return false;
    setBusy(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) setError(authError.code === 'invalid_credentials' ? 'ایمیل یا رمز عبور درست نیست.' : authError.code === 'email_not_confirmed' ? 'ایمیل حساب هنوز تأیید نشده است.' : authError.code === 'over_request_rate_limit' ? 'درخواست‌های زیاد فرستاده شده است. کمی صبر کنید.' : 'عملیات حساب انجام نشد. دوباره کوشش کنید یا با مدیر تماس بگیرید.');
      return !authError;
    } catch {
      setError('ارتباط برقرار نشد. اتصال انترنت را بررسی کرده و دوباره کوشش کنید.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase || busy) return;
    setBusy(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signOut();
      if (authError) setError(authError.code === 'invalid_credentials' ? 'ایمیل یا رمز عبور درست نیست.' : authError.code === 'email_not_confirmed' ? 'ایمیل حساب هنوز تأیید نشده است.' : authError.code === 'over_request_rate_limit' ? 'درخواست‌های زیاد فرستاده شده است. کمی صبر کنید.' : 'عملیات حساب انجام نشد. دوباره کوشش کنید یا با مدیر تماس بگیرید.');
    } catch {
      setError('خروج انجام نشد. لطفاً دوباره کوشش کنید.');
    } finally {
      setBusy(false);
    }
  }

  return { session, loading, busy, error, signIn, signOut, configured: Boolean(supabase) };
}
