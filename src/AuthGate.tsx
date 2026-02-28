import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import App from './App';
import LoginPage from './LoginPage';
import ResetPasswordPage from './ResetPasswordPage';

interface UserProfile {
  id: number;
  name: string;
  role: 'broker' | 'manager' | 'admin';
  email?: string;
  phone?: string;
}

type AuthState = 'loading' | 'login' | 'reset' | 'app';

export default function AuthGate() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const fetchPublicUser = async (authId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .single();
    if (data) {
      setCurrentUser(data);
      setAuthState('app');
    } else {
      // auth user exists but no public.users row — fallback to login
      await supabase.auth.signOut();
      setAuthState('login');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchPublicUser(session.user.id);
      } else {
        setAuthState('login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthState('reset');
      } else if (event === 'SIGNED_IN' && session) {
        fetchPublicUser(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setAuthState('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authState === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F3F3F3]">
        <div className="w-8 h-8 border-4 border-[#1A55FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authState === 'reset') return <ResetPasswordPage />;
  if (authState === 'login') return <LoginPage />;
  if (authState === 'app' && currentUser) return <App currentUser={currentUser} />;

  return null;
}
