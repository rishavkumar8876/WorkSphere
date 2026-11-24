'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../lib/api-client';
import axios from 'axios';
import { BarChart3, Activity, Download, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

const FASTAPI_ANALYTICS_URL = process.env.NEXT_PUBLIC_ANALYTICS_URL || 'http://localhost:8000/api/v1';

export default function AnalyticsDashboardPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // 1. Fetch Projects from Express API
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiClient.get('/projects');
      return res.data.data;
    },
  });

  const projects = Array.isArray(projectsData) ? projectsData : [];
  const activeProjectId = selectedProjectId || (projects[0]?.id ?? '');

  // 2. Fetch Tasks for the selected project
  const { data: tasksData } = useQuery({
    queryKey: ['tasks', { projectId: activeProjectId }],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const res = await apiClient.get(`/tasks?projectId=${activeProjectId}`);
      return res.data.data;
    },
    enabled: !!activeProjectId,
  });

  const tasks = Array.isArray(tasksData) ? tasksData : [];

  // 3. Query FastAPI Project Health Calculation
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['fastapi-project-health', activeProjectId, tasks.length],
    queryFn: async () => {
      if (!activeProjectId) return null;
      const res = await axios.post(
        `${FASTAPI_ANALYTICS_URL}/analytics/project-health`,
        {
          project_id: activeProjectId,
          project_name: projects.find((p) => p.id === activeProjectId)?.name || 'Project',
          tasks: tasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            created_at: t.createdAt,
            due_date: t.dueDate || null,
            assignee_id: t.assigneeId || null,
          })),
        },
        {
          headers: {
            'X-API-Key': 'worksphere_internal_analytics_api_secret_key',
          },
        }
      );
      return res.data;
    },
    enabled: !!activeProjectId && tasks.length > 0,
  });

  // 4. Trigger streaming CSV export from FastAPI
  const handleExportCSV = async () => {
    try {
      const res = await axios.post(
        `${FASTAPI_ANALYTICS_URL}/analytics/export/csv?filename=project_tasks_export.csv`,
        tasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          version: t.version,
          created_at: t.createdAt,
        })),
        {
          headers: { 'X-API-Key': 'worksphere_internal_analytics_api_secret_key' },
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tasks_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('Export generation failed. Ensure FastAPI service is running on port 8000.');
    }
  };

  const healthScore = healthData?.health_score ?? 85.0;
  const healthStatus = healthData?.status ?? 'HEALTHY';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Delivery Analytics</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              Powered by FastAPI
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time project health scores, cycle-time velocity, and team capacity metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Project selector */}
          {projects.length > 0 && (
            <select
              value={activeProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Analytics Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Health Gauge */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Project Delivery Health
            </div>
            <div className="flex items-baseline gap-3">
              <span
                className={`text-4xl font-extrabold tracking-tight ${
                  healthScore >= 75
                    ? 'text-emerald-600'
                    : healthScore >= 45
                    ? 'text-amber-500'
                    : 'text-rose-600'
                }`}
              >
                {healthLoading ? '...' : `${healthScore}%`}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  healthStatus === 'HEALTHY'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : healthStatus === 'AT_RISK'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {healthStatus}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Calculated by Python algorithm based on overdue work, urgent blockers, and sprint margin.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Completion Rate</span>
            <span className="font-bold text-slate-800">
              {healthData?.completion_rate_percentage || 0}%
            </span>
          </div>
        </div>

        {/* Task Velocity Metrics */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Workload & Overdue Risk
            </div>
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Project Scope:</span>
                <span className="font-bold text-slate-800">{tasks.length} tasks</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Overdue Deliverables:</span>
                <span className="font-bold text-rose-600">
                  {healthData?.overdue_tasks || 0} tasks
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Completed Work:</span>
                <span className="font-bold text-emerald-600">
                  {healthData?.completed_tasks || 0} tasks
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
            Automated health triage updated in real time.
          </div>
        </div>

        {/* Actionable Triage Suggestions */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Algorithmic Recommendations
          </div>

          <div className="space-y-2.5">
            {healthData?.suggested_actions && healthData.suggested_actions.length > 0 ? (
              healthData.suggested_actions.map((act: string, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex items-start gap-2"
                >
                  <TrendingUp className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>{act}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 py-4 text-center">
                Project delivery is tracking according to schedule.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
