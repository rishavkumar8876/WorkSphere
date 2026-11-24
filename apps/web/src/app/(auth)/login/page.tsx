'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const DEMO_ACCOUNTS = [
  { role: 'Platform Admin', email: 'admin@worksphere.io', desc: 'Cross-tenant oversight' },
  { role: 'Org Owner', email: 'owner@acme.com', desc: 'Tenant management' },
  { role: 'Project Manager', email: 'pm@acme.com', desc: 'Projects & task delegation' },
  { role: 'Team Member', email: 'dev@acme.com', desc: 'Assigned tasks & comments' },
  { role: 'Auditor', email: 'auditor@acme.com', desc: 'Compliance & audit logs' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ email, password });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemo = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError(null);
    setIsLoading(true);

    try {
      await login({ email: demoEmail, password: 'Password123!' });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50">
        
        {/* Left Side: Demo Account Quick Selector for Evaluators */}
        <div className="bg-slate-900 p-8 text-white flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
                WS
              </div>
              <span className="font-bold text-xl tracking-tight">WorkSphere</span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Live Role Evaluation</h2>
            <p className="text-xs text-slate-400 mb-6">
              Select one of the 5 seeded roles below to instantly test role-based permissions and tenant boundaries.
            </p>

            <div className="space-y-2.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectDemo(acc.email)}
                  className="w-full text-left p-3 rounded-xl bg-slate-800/80 hover:bg-indigo-900/60 border border-slate-700/80 hover:border-indigo-500/80 transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-200 group-hover:text-white flex items-center gap-2">
                      <span>{acc.role}</span>
                      <span className="text-[10px] font-normal text-indigo-400">({acc.email})</span>
                    </div>
                    <div className="text-[11px] text-slate-400">{acc.desc}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Multi-tenant isolation & JWT refresh active</span>
          </div>
        </div>

        {/* Right Side: Standard Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-slate-900">Sign In</h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter your credentials to access your organization workspace.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
            >
              {isLoading ? 'Signing In...' : 'Sign In to Workspace'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-indigo-600 hover:underline font-semibold">
              Create an Organization
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
