'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Loader2, AlertCircle, Check, X } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/utils/cn';
import { getPasswordStrength } from '@/utils/format';

const registerSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  agree_terms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms of service',
  }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      agree_terms: false,
    },
  });

  const password = watch('password', '');
  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await registerUser({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { met: /[a-z]/.test(password), text: 'One lowercase letter' },
    { met: /\d/.test(password), text: 'One number' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left side - Feature Highlights */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary-500 to-primary-700">
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="max-w-md text-white">
            <h1 className="text-4xl font-bold mb-6">Join D'Insight</h1>
            <p className="text-lg mb-8 text-primary-100">
              Start your journey to predictive maintenance excellence.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Free Trial</h3>
                  <p className="text-sm text-primary-100">
                    Start with a 14-day free trial of all premium features
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">No Credit Card Required</h3>
                  <p className="text-sm text-primary-100">
                    Explore all features without any payment information
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Expert Support</h3>
                  <p className="text-sm text-primary-100">
                    Get help from our team of predictive maintenance experts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Registration Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-2xl font-bold">D</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create Account</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Get started with your free D'Insight account
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Registration Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              {/* Full Name Field */}
              <div>
                <label
                  htmlFor="full_name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Full Name
                </label>
                <input
                  {...register('full_name')}
                  type="text"
                  autoComplete="name"
                  className={cn(
                    'mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                    'transition-colors duration-200',
                    errors.full_name
                      ? 'border-red-300 text-red-900 placeholder-red-300'
                      : 'border-gray-300'
                  )}
                  placeholder="John Doe"
                />
                {errors.full_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email Address
                </label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className={cn(
                    'mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                    'transition-colors duration-200',
                    errors.email
                      ? 'border-red-300 text-red-900 placeholder-red-300'
                      : 'border-gray-300'
                  )}
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={cn(
                      'block w-full px-3 py-2 pr-10 border rounded-lg shadow-sm',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                      'transition-colors duration-200',
                      errors.password
                        ? 'border-red-300 text-red-900 placeholder-red-300'
                        : 'border-gray-300'
                    )}
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    )}
                  </button>
                </div>

                {/* Password strength indicator */}
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-2">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-1 flex-1 rounded-full',
                            i < passwordStrength.score
                              ? passwordStrength.score <= 2
                                ? 'bg-red-500'
                                : passwordStrength.score <= 4
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              : 'bg-gray-200'
                          )}
                        />
                      ))}
                    </div>
                    <p className={cn('text-sm', passwordStrength.color)}>
                      Password strength: {passwordStrength.label}
                    </p>
                  </div>
                )}

                {/* Password requirements */}
                <div className="mt-2 space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {req.met ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                      )}
                      <span
                        className={
                          req.met
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }
                      >
                        {req.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Organization Code Field */}
            </div>

            {/* Terms of Service */}
            <div className="flex items-start">
              <input
                {...register('agree_terms')}
                id="agree-terms"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-0.5"
              />
              <label
                htmlFor="agree-terms"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                I agree to the{' '}
                <Link href="/terms" className="text-primary-600 hover:text-primary-500">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary-600 hover:text-primary-500">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.agree_terms && (
              <p className="text-sm text-red-600">{errors.agree_terms.message}</p>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  'w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm',
                  'text-sm font-medium text-white bg-primary-600 hover:bg-primary-700',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
                  'transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>

            {/* Sign in link */}
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
