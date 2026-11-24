'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { TaskDTO } from '@worksphere/shared-types';

interface OCCConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshAndResolve: () => void;
  localTask: Partial<TaskDTO> | null;
  serverTask: Partial<TaskDTO> | null;
}

export function OCCConflictModal({
  isOpen,
  onClose,
  onRefreshAndResolve,
  localTask,
  serverTask,
}: OCCConflictModalProps) {
  if (!isOpen || !serverTask) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-amber-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-900">
                Optimistic Concurrency Conflict
              </h3>
              <p className="text-xs text-amber-700">
                Another user updated this task while you were viewing it.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Comparison */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            To prevent silent overwrites and loss of team progress, your change was paused.
            Below is the difference between your pending change and the current server record:
          </p>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Local changes */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Your Attempted Update
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-slate-400">Version:</span>{' '}
                  <span className="font-mono text-slate-700 font-bold">
                    v{localTask?.version || 1}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>{' '}
                  <span className="font-semibold text-indigo-600">{localTask?.status}</span>
                </div>
              </div>
            </div>

            {/* Current Server state */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="font-semibold text-emerald-800 uppercase tracking-wider mb-2">
                Current Server State
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-emerald-600">Version:</span>{' '}
                  <span className="font-mono text-emerald-900 font-bold">
                    v{serverTask?.version || 2}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-600">Status:</span>{' '}
                  <span className="font-semibold text-emerald-700">{serverTask?.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onRefreshAndResolve}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Load Latest Changes & Merge</span>
          </button>
        </div>
      </div>
    </div>
  );
}
