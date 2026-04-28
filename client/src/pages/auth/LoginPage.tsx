import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Loader2, LogIn, Moon, Sun } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api';

export function LoginPage() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      setLoading(false);
      return;
    }

    try {
      await login(username, password);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid username or password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-mesh relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 sm:p-6">
      <motion.div
        className="relative z-10 w-full max-w-[420px]"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="mb-8 text-center sm:mb-10">
          <div className="mb-4 inline-flex h-24 w-32 items-center justify-center">
            <img src="/assets/ism-logo.jpg" alt="ISM Group of Company" className="h-full w-full object-contain" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Sign in to manage payroll, attendance, and reports.</p>
        </div>

        <div className="glass-panel p-6 sm:p-8">
          <h2 className="mb-1 text-center text-lg font-semibold text-foreground">Welcome back</h2>
          <p className="mb-6 text-center text-sm text-muted-foreground">Enter your organization credentials</p>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
              />
            </div>
            {error && (
              <p className="rounded-lg border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-400" role="alert">
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
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign in
                </span>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">Secure access to ISM salary operations</p>
        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
