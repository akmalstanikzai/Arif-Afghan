import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client.js';

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
      if (sessionError) setError("Your session could not be restored. Please sign in again.");
      setLoading(false);
    }).catch(() => {
      if (active && !authChanged) {
        setError("Could not connect. Check your internet connection and try again.");
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
      if (authError) setError(authError.code === 'invalid_credentials' ? "The email or password is incorrect." : authError.code === 'email_not_confirmed' ? "The account email has not been confirmed." : authError.code === 'over_request_rate_limit' ? "Too many requests. Please wait a moment." : "The account operation failed. Try again or contact your administrator.");
      return !authError;
    } catch {
      setError("Could not connect. Check your internet connection and try again.");
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
      if (authError) setError(authError.code === 'invalid_credentials' ? "The email or password is incorrect." : authError.code === 'email_not_confirmed' ? "The account email has not been confirmed." : authError.code === 'over_request_rate_limit' ? "Too many requests. Please wait a moment." : "The account operation failed. Try again or contact your administrator.");
    } catch {
      setError("Sign-out failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return { session, loading, busy, error, signIn, signOut, configured: Boolean(supabase) };
}
