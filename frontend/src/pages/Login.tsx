import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  username_or_email: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');

    try {
      await login(data.username_or_email, data.password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="max-w-md w-full space-y-8">
          {/* Logo */}
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Whazz Audio
            </h1>
          </div>

          {/* Welcome Text */}
          <div className="mt-8">
            <h2 className="text-4xl font-bold text-slate-900 leading-tight">
              Welcome back
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Sign in to continue to your account
            </p>
          </div>

          {/* Login Form */}
          <form className="mt-10 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <div className="text-sm text-red-800 font-medium">{error}</div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="username_or_email" className="block text-sm font-semibold text-slate-700 mb-2">
                  Username or Email
                </label>
                <input
                  {...register('username_or_email')}
                  id="username_or_email"
                  type="text"
                  autoComplete="username"
                  className="appearance-none block w-full px-4 py-3.5 bg-white border border-slate-300 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all shadow-sm"
                  placeholder="Enter your username or email"
                />
                {errors.username_or_email && (
                  <p className="mt-2 text-sm text-red-600 font-medium">{errors.username_or_email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                  Password
                </label>
                <input
                  {...register('password')}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="appearance-none block w-full px-4 py-3.5 bg-white border border-slate-300 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all shadow-sm"
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600 font-medium">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>

            <div className="text-center">
              <span className="text-slate-600">Don't have an account? </span>
              <Link
                to="/signup"
                className="font-semibold text-violet-600 hover:text-violet-700 transition-colors"
              >
                Create account
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:block relative flex-1 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0aDR2NGgtNHpNMTQgMzZoNHY0aC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>

        {/* Decorative elements - moved behind content */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/5 rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-white/5 rounded-full"></div>
        <div className="absolute top-1/2 right-32 w-24 h-24 bg-white/5 rounded-2xl rotate-12"></div>

        <div className="relative inset-0 flex items-center justify-center p-12 min-h-full">
          <div className="text-center text-white max-w-xl px-6">
            <div className="mb-10">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-sm rounded-3xl mb-6">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18V5l12-2v13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="6" cy="18" r="3" stroke="white" strokeWidth="2"/>
                  <circle cx="18" cy="16" r="3" stroke="white" strokeWidth="2"/>
                </svg>
              </div>
            </div>
            <h3 className="text-4xl font-bold mb-6 leading-tight tracking-tight">
              Transform Your Audio Experience
            </h3>
            <p className="text-lg text-white/90 leading-relaxed">
              Professional-grade audio processing powered by cutting-edge AI technology
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
