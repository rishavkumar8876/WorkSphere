'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, Bell, LogOut, ChevronDown } from 'lucide-react';

export function Navbar() {
  const { user, activeOrgId, switchOrganization, logout } = useAuth();

  const currentOrg = user?.organizations?.find((o) => o.id === activeOrgId) || {
    name: user?.organizationName || 'Default Organization',
    id: activeOrgId,
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
      {/* Active Organization Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>{currentOrg.name}</span>
          {user?.organizations && user.organizations.length > 1 && (
            <select
              value={activeOrgId || ''}
              onChange={(e) => switchOrganization(e.target.value)}
              className="bg-transparent text-xs text-slate-500 border-none focus:outline-none cursor-pointer ml-1"
            >
              {user.organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* User profile & actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          type="button"
          aria-label="View notifications"
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full" />
        </button>

        {/* Profile info */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs border border-indigo-200">
            {user?.firstName?.charAt(0) || 'U'}
            {user?.lastName?.charAt(0) || ''}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-slate-800">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-[11px] text-slate-500">{user?.email}</div>
          </div>

          <button
            onClick={logout}
            title="Log out"
            aria-label="Log out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-2"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
