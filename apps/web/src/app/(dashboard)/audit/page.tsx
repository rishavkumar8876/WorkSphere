'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../lib/api-client';
import { ShieldCheck, Search, Filter, ShieldAlert } from 'lucide-react';

export default function AuditLogsPage() {
  const [selectedAction, setSelectedAction] = useState<string>('');

  const { data: auditData, isLoading, error } = useQuery({
    queryKey: ['audit-logs', { action: selectedAction }],
    queryFn: async () => {
      const url = selectedAction ? `/audit-logs?action=${selectedAction}` : '/audit-logs';
      const res = await apiClient.get(url);
      return res.data.data;
    },
  });

  const logs = Array.isArray(auditData) ? auditData : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Compliance & Audit Trail</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Immutable Records
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Tamper-evident audit logs capturing every user login, data modification, and permission change.
          </p>
        </div>

        {/* Action filter */}
        <div className="flex items-center gap-3">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="EXPORT">EXPORT</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center">
          <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-rose-800">Access Denied</h4>
          <p className="text-xs text-rose-600 mt-1">
            Audit log records are restricted to users with the Auditor or Organization Owner role.
          </p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-sm text-slate-400">Loading compliance audit records...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No audit events recorded</h3>
          <p className="text-xs text-slate-500 mt-1">
            Audit records will automatically populate as actions are performed in the platform.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Entity</th>
                  <th className="px-5 py-3.5">Actor</th>
                  <th className="px-5 py-3.5">IP Address</th>
                  <th className="px-5 py-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'CREATE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.action === 'UPDATE'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : log.action === 'DELETE'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">
                      {log.entityType} <span className="text-slate-400 font-normal">({log.entityId.slice(0, 8)}...)</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {log.user ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})` : 'System Process'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
