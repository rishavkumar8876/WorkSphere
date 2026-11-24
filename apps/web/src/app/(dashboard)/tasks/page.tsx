'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../lib/api-client';
import { useAuth } from '../../../context/AuthContext';
import { CheckSquare, Clock, Filter, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function MyTasksPage() {
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['my-tasks', { status: selectedStatus }],
    queryFn: async () => {
      const url = selectedStatus ? `/tasks?status=${selectedStatus}` : '/tasks';
      const res = await apiClient.get(url);
      return res.data.data;
    },
  });

  const tasks = Array.isArray(tasksData) ? tasksData : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Assigned Tasks</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and prioritize your active project responsibilities.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-slate-400">Loading your tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No tasks found</h3>
          <p className="text-xs text-slate-500 mt-1">
            You currently have no tasks matching this filter.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {tasks.map((task: any) => (
              <div
                key={task.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      v{task.version}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        task.priority === 'URGENT'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : task.priority === 'HIGH'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {task.project?.name || 'Project'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">{task.title}</h4>
                  {task.description && (
                    <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      task.status === 'DONE'
                        ? 'bg-emerald-50 text-emerald-700'
                        : task.status === 'IN_PROGRESS'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {task.status}
                  </span>

                  <Link
                    href={`/projects/${task.projectId}`}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Open Board →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
