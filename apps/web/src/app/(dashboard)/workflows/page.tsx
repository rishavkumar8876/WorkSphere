'use client';

import React, { useState } from 'react';
import { Zap, Plus, CheckCircle, ArrowRight } from 'lucide-react';

const SAMPLE_RULES = [
  {
    id: 'wf-1',
    name: 'Auto-Notify on Urgent Tasks',
    trigger: 'TASK_CREATED',
    condition: 'Priority is URGENT',
    action: 'Send instant notification to Project Manager',
    isActive: true,
  },
  {
    id: 'wf-2',
    name: 'Audit Log on Status Completion',
    trigger: 'STATUS_CHANGED',
    condition: 'Status changes to DONE',
    action: 'Record immutable compliance event & update milestone progress',
    isActive: true,
  },
  {
    id: 'wf-3',
    name: 'Optimistic Concurrency Conflict Alert',
    trigger: 'TASK_CONFLICT',
    condition: 'Version mismatch detected',
    action: 'Push real-time conflict notification to user WebSocket',
    isActive: true,
  },
];

export default function WorkflowsPage() {
  const [rules, setRules] = useState(SAMPLE_RULES);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Workflow Automation</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Event-Driven Engine
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Automate task assignments, status transitions, and team alerts based on domain events.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  {rule.trigger}
                </span>
                <button
                  type="button"
                  onClick={() => toggleRule(rule.id)}
                  aria-label={`Toggle ${rule.name}`}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    rule.isActive ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              <h4 className="font-bold text-sm text-slate-800">{rule.name}</h4>
              <div className="mt-3 text-xs space-y-1.5 text-slate-500">
                <div>
                  <span className="font-semibold text-slate-600">When:</span> {rule.condition}
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Then:</span> {rule.action}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className={`font-semibold ${rule.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                {rule.isActive ? 'Active & Listening' : 'Paused'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
