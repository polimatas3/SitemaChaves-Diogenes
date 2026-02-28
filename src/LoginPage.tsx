import React, { useState } from 'react';
import { Key } from 'lucide-react';
import { supabase } from './lib/supabase';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'recovery'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveryEmailSent, setRecoveryEmailSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError('E-mail ou senha incorretos.');
    setLoading(false);
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) {
      setError(error.message);
    } else {
      setRecoveryEmailSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F3F3F3] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-[#1A55FF] p-3 rounded-xl">
            <Key className="text-white w-6 h-6" />
          </div>
          <h1 className="font-black text-2xl tracking-tight">Diógenes Gestão</h1>
          <p className="text-slate-500 text-sm text-center">
            {mode === 'login' ? 'Entre com suas credenciais' : 'Recuperação de senha'}
          </p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Email
              </label>
              <input
                required
                type="email"
                placeholder="email@exemplo.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Senha
              </label>
              <input
                required
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-rose-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1A55FF] text-white py-3 font-bold rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('recovery'); setError(''); }}
              className="w-full text-sm text-slate-500 hover:text-[#1A55FF] transition-colors"
            >
              Esqueci minha senha
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {recoveryEmailSent ? (
              <div className="text-center space-y-3 py-4">
                <p className="text-emerald-600 font-semibold">E-mail enviado!</p>
                <p className="text-slate-500 text-sm">
                  Verifique sua caixa de entrada para redefinir sua senha.
                </p>
                <button
                  onClick={() => { setMode('login'); setRecoveryEmailSent(false); setEmail(''); }}
                  className="text-sm text-[#1A55FF] hover:underline"
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecovery} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                    Email
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="email@exemplo.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A55FF]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {error && <p className="text-rose-500 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1A55FF] text-white py-3 font-bold rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className="w-full text-sm text-slate-500 hover:text-[#1A55FF] transition-colors"
                >
                  Voltar ao login
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
