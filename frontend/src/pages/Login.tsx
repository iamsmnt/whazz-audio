import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { guestAPI } from '@/lib/api';
import { AudioWaveform, Mail, Lock, LogIn, UserPlus, User } from 'lucide-react';

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
  const [isGuestLoading, setIsGuestLoading] = useState(false);

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
      navigate('/process');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    setError('');

    try {
      const response = await guestAPI.createSession();
      localStorage.setItem('guestId', response.guest_id);
      navigate('/process');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create guest session. Please try again.');
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50 flex items-center justify-center p-4">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-200/20 rounded-full blur-2xl"></div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-teal-100">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-4 rounded-2xl shadow-lg">
                <AudioWaveform className="w-12 h-12 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              Whazz Audio
            </h1>
            <p className="text-slate-600 text-sm font-medium">
              AI-Powered Audio Processing
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3">
                <div className="text-sm text-red-700 font-medium">{error}</div>
              </div>
            )}

            {/* Username/Email Input */}
            <div>
              <label htmlFor="username_or_email" className="block text-sm font-semibold text-slate-700 mb-2">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-teal-500" />
                </div>
                <input
                  {...register('username_or_email')}
                  id="username_or_email"
                  type="text"
                  autoComplete="username"
                  className="block w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-sm hover:border-teal-300"
                  placeholder="Enter username or email"
                />
              </div>
              {errors.username_or_email && (
                <p className="mt-2 text-sm text-red-600 font-medium">{errors.username_or_email.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-teal-500" />
                </div>
                <input
                  {...register('password')}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="block w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-sm hover:border-teal-300"
                  placeholder="Enter password"
                />
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Sign In Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || isGuestLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-base font-bold rounded-xl text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 focus:outline-none focus:ring-4 focus:ring-teal-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </span>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative pt-4 pb-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-slate-500 font-medium">OR</span>
              </div>
            </div>

            {/* Continue as Guest Button */}
            <div>
              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={isLoading || isGuestLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-base font-bold rounded-xl text-teal-600 bg-white border-2 border-teal-500 hover:bg-teal-50 focus:outline-none focus:ring-4 focus:ring-teal-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {isGuestLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Guest Session...
                  </span>
                ) : (
                  <>
                    <User className="w-5 h-5" />
                    Continue as Guest
                  </>
                )}
              </button>
            </div>

            {/* Sign Up Link */}
            <div className="text-center pt-4 border-t border-slate-200">
              <span className="text-slate-600 text-sm font-medium">Don't have an account? </span>
              <Link
                to="/signup"
                className="text-teal-600 font-bold hover:text-teal-700 transition-colors inline-flex items-center gap-1"
              >
                Create Account
                <UserPlus className="w-4 h-4" />
              </Link>
            </div>
          </form>
        </div>

        {/* Footer Text */}
        <div className="text-center mt-6">
          <p className="text-slate-600 text-xs font-medium">
            Professional audio enhancement powered by AI
          </p>
        </div>
      </div>
    </div>
  );
}
