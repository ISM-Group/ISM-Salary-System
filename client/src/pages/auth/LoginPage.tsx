import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, Shield } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const nextPath = (location.state as { from?: string } | null)?.from || '/admin/dashboard';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      navigate(nextPath, { replace: true });
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-mesh relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -right-20 -top-32 h-96 w-96 rounded-full bg-indigo-400/35 blur-3xl" />
        <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-violet-400/30 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-[420px]"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="mb-8 text-center sm:mb-10">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <Shield className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">ISM Salary</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to manage payroll, attendance, and reports.</p>
        </div>

        <div className="glass-panel p-6 sm:p-8">
          <h2 className="mb-1 text-center text-lg font-semibold text-slate-900">Welcome back</h2>
          <p className="mb-6 text-center text-sm text-slate-600">Enter your organization credentials</p>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 border-white/50 bg-white/50 text-slate-900"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-white/50 bg-white/50 text-slate-900"
                required
              />
            </div>
            {error && (
              <p className="rounded-lg border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-sm text-rose-700" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              variant="accent"
              className="h-11 w-full cursor-pointer font-semibold transition-opacity duration-200 hover:opacity-95"
              disabled={loading}
            >
              {loading ? (
                'Signing in…'
              ) : (
                <span className="inline-flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign in
                </span>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">Secure access to ISM salary operations</p>
      </motion.div>
    </div>
  );
}
