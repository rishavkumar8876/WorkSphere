'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '@worksphere/shared-types';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  ShieldCheck,
  BarChart3,
  Settings,
  Mail,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role;

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: Object.values(UserRole),
    },
    {
      label: 'Projects',
      href: '/projects',
      icon: FolderKanban,
      roles: [UserRole.PLATFORM_ADMIN, UserRole.ORG_OWNER, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER],
    },
    {
      label: 'My Tasks',
      href: '/tasks',
      icon: CheckSquare,
      roles: [UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER],
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      roles: [UserRole.PLATFORM_ADMIN, UserRole.ORG_OWNER, UserRole.PROJECT_MANAGER],
    },
    {
      label: 'Teams & Members',
      href: '/org/teams',
      icon: Users,
      roles: [UserRole.PLATFORM_ADMIN, UserRole.ORG_OWNER, UserRole.PROJECT_MANAGER],
    },
    {
      label: 'Invitations',
      href: '/org/invitations',
      icon: Mail,
      roles: [UserRole.PLATFORM_ADMIN, UserRole.ORG_OWNER],
    },
    {
      label: 'Workflows',
      href: '/workflows',
      icon: Zap,
      roles: [UserRole.PLATFORM_ADMIN, UserRole.ORG_OWNER, UserRole.PROJECT_MANAGER],
    },
    {
      label: 'Audit Logs',
      href: '/audit',
      icon: ShieldCheck,
      roles: [UserRole.PLATFORM_ADMIN, UserRole.ORG_OWNER, UserRole.AUDITOR],
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      roles: Object.values(UserRole),
    },
  ];

  const filteredNav = navItems.filter((item) => role && item.roles.includes(role));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 shrink-0">
      {/* Brand header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
          WS
        </div>
        <span className="font-bold text-lg text-white tracking-tight">WorkSphere</span>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Role badge footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="text-xs text-slate-400">Current Role</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            {role?.replace('_', ' ') || 'GUEST'}
          </span>
        </div>
      </div>
    </aside>
  );
}
