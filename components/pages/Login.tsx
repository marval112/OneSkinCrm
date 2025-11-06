

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { getBrandLogoUrl, getBrandName, BRANDING_UPDATED_EVENT } from '../../services/brandingService';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [brandName, setBrandName] = useState<string>(getBrandName());
  const [brandLogoUrl, setBrandLogoUrl] = useState<string>(getBrandLogoUrl());
  const { login } = useAuth();

  useEffect(() => {
    const onUpdate = () => {
      setBrandName(getBrandName());
      setBrandLogoUrl(getBrandLogoUrl());
    };
    window.addEventListener(BRANDING_UPDATED_EVENT, onUpdate as EventListener);
    return () => window.removeEventListener(BRANDING_UPDATED_EVENT, onUpdate as EventListener);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid credentials. Please try again.');
      }
      // On success, the AuthProvider will handle the redirect
    } catch (err) {
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <div className="flex flex-col items-center">
          <img
            src={brandLogoUrl}
            alt={brandName}
            className="h-12 w-auto mb-2 object-contain"
            onError={({ currentTarget }) => { (currentTarget as HTMLImageElement).src = '/dashboard/logo.png'; }}
          />
          <h1 className="text-3xl font-bold text-center text-slate-900 dark:text-white">{brandName}</h1>
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">Sign in to your account</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="text"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                placeholder="Email address or username"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                placeholder="Password"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-slate-400"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;