'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../lib/api-client';
import { useAuth } from '../../../context/AuthContext';
import { FolderKanban, CheckCircle2, Clock, AlertTriangle, ArrowUpRight, Plus } from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverviewPage() {
  const { user } = useAuth();

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiClient.get('/projects');
      return res.data.data;
    },
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await apiClient.get('/tasks');
      return res.data.data;
    },
  });

  const projects = Array.isArray(projectsData) ? projectsData : [];
  const tasks = Array.isArray(tasksData) ? tasksData : [];

  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const urgentTasks = tasks.filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Logged in as <span className="font-semibold text-indigo-600">{user?.role}</span> in{' '}
            <span className="font-semibold text-slate-800">{user?.organizationName || 'Acme Corporation'}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>View Projects</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Projects
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {projectsLoading ? '...' : projects.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FolderKanban className="w-5 h-5" />
          </div>
        </div>

        {/* In Progress Tasks */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              In Progress Tasks
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {tasksLoading ? '...' : inProgressTasks}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed Tasks
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {tasksLoading ? '...' : completedTasks}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* High/Urgent Priority */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Urgent & High
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {tasksLoading ? '...' : urgentTasks}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Recent Projects and Tasks Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects Preview */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-900">Active Projects</h3>
            <Link href="/projects" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
              <span>View all</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="text-sm text-slate-400 py-6 text-center">No projects found.</div>
            ) : (
              projects.slice(0, 4).map((p: any) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="p-3.5 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-slate-50 transition-all flex items-center justify-between block"
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Key: {p.key} • {p._count?.tasks || 0} tasks</div>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    {p.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Tasks Preview */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-900">Recent Tasks (OCC Enabled)</h3>
            <Link href="/tasks" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
              <span>View all</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-sm text-slate-400 py-6 text-center">No tasks found.</div>
            ) : (
              tasks.slice(0, 4).map((t: any) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-lg border border-slate-100 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-800">{t.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Status: <span className="font-medium text-slate-600">{t.status}</span> • Priority: <span className="font-medium text-slate-600">{t.priority}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    v{t.version}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
