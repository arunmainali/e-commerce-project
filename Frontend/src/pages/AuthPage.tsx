import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Toast } from '../components/Toast';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('jane@example.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Jane Collector');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = useAuthStore((state) => state.signIn);
  const addToast = useToastStore((state) => state.addToast);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const res = await authService.signIn(email, password);
        if (res.success && res.user) {
          signIn(res.user);
          addToast(`Signed in as ${res.user.name}`, 'success');
          navigate('/account');
        } else {
          setError(res.message || 'Authentication failed');
        }
      } else {
        const res = await authService.register(name, email, password);
        if (res.success && res.user) {
          signIn(res.user);
          addToast(`Account created for ${res.user.name}`, 'success');
          navigate('/account');
        } else {
          setError(res.message || 'Registration failed');
        }
      }
    } catch {
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-primary">
      <Header />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 py-12 flex justify-center text-left">
        <div className="w-full max-w-sm border border-hairline p-6 bg-surface/30">
          <div className="flex border-b border-hairline mb-4">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold uppercase tracking-wider text-center ${
                mode === 'signin'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold uppercase tracking-wider text-center ${
                mode === 'register'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Register
            </button>
          </div>

          <h1 className="text-base font-semibold text-primary mb-1">
            {mode === 'signin' ? 'Access Client Portal' : 'Create Collector Account'}
          </h1>
          <p className="text-xs text-secondary mb-4">
            Manage your bidding credentials, watchlists, invoices, and consignment lots.
          </p>

          {error && (
            <div className="mb-3 p-2 bg-accent/10 border border-accent text-accent text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Password
              </label>
              <input
                type="password"
                required
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2 text-xs font-semibold mt-2"
            >
              {loading
                ? 'Processing...'
                : mode === 'signin'
                ? 'Sign In'
                : 'Complete Registration'}
            </button>
          </form>

          <div className="mt-4 pt-3 hairline-t text-[11px] text-secondary">
            Mock credentials enabled. Any input is accepted for testing.
          </div>
        </div>
      </main>

      <Footer />
      <Toast />
    </div>
  );
};
