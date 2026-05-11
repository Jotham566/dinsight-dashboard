'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Loader2, AlertCircle, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api-client';
import { cn } from '@/utils/cn';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // SSO is discovered at mount via /auth/sso/config. When the backend has
  // no OIDC env vars set the response is { enabled: false } and the SSO
  // button stays hidden. ssoLabel surfaces the deployment-configured
  // button label (defaults to "Single sign-on").
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [ssoLabel, setSsoLabel] = useState('Single sign-on');

  const registered = searchParams.get('registered') === 'true';
  const returnUrl = searchParams.get('returnUrl');

  useEffect(() => {
    let cancelled = false;
    api.auth
      .ssoConfig()
      .then((res) => {
        if (cancelled) return;
        const cfg = res.data?.data as { enabled?: boolean; label?: string } | undefined;
        if (cfg?.enabled) {
          setSsoEnabled(true);
          if (cfg.label) setSsoLabel(cfg.label);
        }
      })
      .catch(() => {
        // Backend SSO discovery failure is silently treated as disabled —
        // the password flow is the default and stays available.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember_me: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await login({
        email: data.email,
        password: data.password,
        remember_me: data.remember_me,
      });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-accent rounded-lg flex items-center justify-center shadow-md">
                <span className="text-accent-contrast text-2xl font-bold">D</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-fg">Welcome back</h2>
            <p className="mt-2 text-sm text-fg-muted">Sign in to your D'Insight account</p>
          </div>

          {/* Success message for new registration */}
          {registered && (
            <div className="bg-success-bg border border-success-border text-success-text px-4 py-3 rounded-lg">
              <p className="text-sm">
                Registration successful! Please sign in with your credentials.
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-danger-bg border border-danger-border text-danger-text px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-fg">
                  Email Address
                </label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className={cn(
                    'mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm bg-surface text-fg',
                    'focus:outline-none focus:ring-2 focus:ring-focus focus:border-control-border-focus',
                    'transition-colors duration-200',
                    errors.email ? 'border-danger-border text-danger-text ' : 'border-strong'
                  )}
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-danger-text">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-fg">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={cn(
                      'block w-full px-3 py-2 pr-10 border rounded-lg shadow-sm bg-surface text-fg',
                      'focus:outline-none focus:ring-2 focus:ring-focus focus:border-control-border-focus',
                      'transition-colors duration-200',
                      errors.password ? 'border-danger-border text-danger-text ' : 'border-strong'
                    )}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-fg-subtle" />
                    ) : (
                      <Eye className="h-5 w-5 text-fg-subtle" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-danger-text">{errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Remember me and Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  {...register('remember_me')}
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-accent focus:ring-focus border-strong rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-fg">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-accent hover:text-accent">
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  'w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm',
                  'text-sm font-medium text-accent-contrast bg-accent hover:bg-accent-hover',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-focus',
                  'transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>

            {/* SSO sign-in. Only renders when the backend reports
                /auth/sso/config { enabled: true }. The button is a plain
                <a> (full-page navigation) because the OIDC dance unloads
                the SPA, hits the IdP, and returns the user to the
                callback URL with cookies set. */}
            {ssoEnabled && (
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-canvas px-2 text-fg-subtle">or</span>
                  </div>
                </div>
                <a
                  href="/api/v1/auth/sso/login"
                  className={cn(
                    'w-full flex items-center justify-center py-3 px-4 border border-border rounded-lg',
                    'text-sm font-medium text-fg bg-surface hover:bg-surface-hover',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-canvas',
                    'transition-colors duration-150'
                  )}
                >
                  <KeyRound className="h-4 w-4 mr-2 text-fg-muted" aria-hidden="true" />
                  Continue with {ssoLabel}
                </a>
              </div>
            )}

            {/* Sign up link */}
            <div className="text-center">
              <p className="text-sm text-fg-muted">
                Don't have an account?{' '}
                <Link href="/register" className="font-medium text-accent hover:text-accent">
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Right side — operator-tone capability summary, not marketing copy */}
      <div className="hidden lg:flex lg:flex-1 bg-surface-muted border-l border-border">
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="max-w-md text-fg">
            <h2 className="text-2xl font-semibold mb-2">Sign in to continue monitoring</h2>
            <p className="text-sm mb-8 text-fg-muted">
              D'Insight watches your equipment for early signs of deterioration so the team can act
              before failures escalate.
            </p>
            <dl className="space-y-5">
              <div>
                <dt className="text-sm font-semibold text-fg">Live machine state</dt>
                <dd className="mt-1 text-sm text-fg-muted">
                  OK, Deteriorating, or Failing — at a glance, on every screen.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-fg">Baseline-aware anomaly detection</dt>
                <dd className="mt-1 text-sm text-fg-muted">
                  Surfaces drift from healthy behaviour the moment it starts.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-fg">Deterioration trend</dt>
                <dd className="mt-1 text-sm text-fg-muted">
                  Quantifies wear over time so maintenance can be scheduled, not reactive.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
