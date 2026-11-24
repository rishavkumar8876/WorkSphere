'use client';

import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../../../lib/api-client';
import { Settings, Building2, User, Shield, Check } from 'lucide-react';
import { UserRole } from '@worksphere/shared-types';

export default function SettingsPage() {
  const { user } = useAuth();
  const [orgName, setOrgName] = useState(user?.organizationName || '');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isOwner = user?.role === UserRole.ORG_OWNER || user?.role === UserRole.PLATFORM_ADMIN;

  const updateMutation = useMutation({
    mutationFn: async (payload: { name: string }) => {
      return apiClient.patch('/organizations/current', payload);
    },
    onSuccess: () => {
      setSuccessMsg('Organization settings updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings & Workspace</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your account profile and organization preferences.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-100">
            {user?.firstName?.charAt(0)}
            {user?.lastName?.charAt(0)}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {user?.firstName} {user?.lastName}
            </h3>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400">Assigned Platform Role:</span>
            <div className="font-bold text-slate-800 mt-0.5">{user?.role}</div>
          </div>
          <div>
            <span className="text-slate-400">Tenant Workspace ID:</span>
            <div className="font-mono text-slate-600 mt-0.5">{user?.organizationId || 'None'}</div>
          </div>
        </div>
      </div>

      {/* Organization Settings */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900">Organization Settings</h3>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isOwner) updateMutation.mutate({ name: orgName });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              disabled={!isOwner}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full max-w-md px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
            />
            {!isOwner && (
              <p className="text-[11px] text-slate-400 mt-1">
                Only Organization Owners can update the company name.
              </p>
            )}
          </div>

          {isOwner && (
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Organization Name'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
