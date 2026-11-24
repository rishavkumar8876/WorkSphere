'use client';

import React, { useState } from 'react';
import { TaskStatus, TaskPriority, TaskDTO } from '@worksphere/shared-types';
import apiClient from '../../lib/api-client';
import { OCCConflictModal } from './OCCConflictModal';
import { Clock, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Plus } from 'lucide-react';
import clsx from 'clsx';

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: TaskStatus.BACKLOG, label: 'Backlog', color: 'border-t-slate-400' },
  { id: TaskStatus.TODO, label: 'To Do', color: 'border-t-blue-500' },
  { id: TaskStatus.IN_PROGRESS, label: 'In Progress', color: 'border-t-amber-500' },
  { id: TaskStatus.IN_REVIEW, label: 'In Review', color: 'border-t-indigo-500' },
  { id: TaskStatus.DONE, label: 'Done', color: 'border-t-emerald-500' },
];

interface KanbanBoardProps {
  tasks: TaskDTO[];
  onTaskUpdated: () => void;
  projectId?: string;
}

export function KanbanBoard({ tasks, onTaskUpdated, projectId }: KanbanBoardProps) {
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictLocal, setConflictLocal] = useState<Partial<TaskDTO> | null>(null);
  const [conflictServer, setConflictServer] = useState<Partial<TaskDTO> | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const handleStatusChange = async (task: TaskDTO, newStatus: TaskStatus) => {
    if (task.status === newStatus) return;

    setUpdatingTaskId(task.id);
    try {
      // Send OCC Version along with update
      await apiClient.patch(`/tasks/${task.id}`, {
        status: newStatus,
        version: task.version, // OPTIMISTIC CONCURRENCY CONTROL
      });
      onTaskUpdated();
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Concurrency conflict occurred!
        const serverSnapshot = err.response.data?.error?.details || {
          ...task,
          version: task.version + 1,
        };
        setConflictLocal({ ...task, status: newStatus });
        setConflictServer(serverSnapshot);
        setIsConflictModalOpen(true);
      } else {
        alert(err.response?.data?.error?.message || 'Failed to update task');
      }
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case TaskPriority.HIGH:
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case TaskPriority.MEDIUM:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-6">
        {COLUMNS.map((col, colIndex) => {
          const colTasks = tasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className={clsx(
                'bg-slate-100/80 rounded-xl p-3 flex flex-col min-h-[500px] border-t-4 border border-slate-200/60 shadow-sm',
                col.color
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    {col.label}
                  </h4>
                  <span className="text-[11px] font-semibold bg-white text-slate-600 px-1.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                    {colTasks.length}
                  </span>
                </div>
              </div>

              {/* Task Cards */}
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-medium">
                    No tasks
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow group relative"
                    >
                      {/* Priority & OCC Version Badge */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span
                          className={clsx(
                            'text-[10px] font-semibold px-2 py-0.5 rounded border',
                            getPriorityBadge(task.priority)
                          )}
                        >
                          {task.priority}
                        </span>

                        <span
                          title="Optimistic Concurrency Control Version"
                          className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200"
                        >
                          v{task.version}
                        </span>
                      </div>

                      {/* Title */}
                      <h5 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                        {task.title}
                      </h5>

                      {/* Card Footer / Move controls */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="truncate max-w-[90px]">
                          {task.assigneeId ? 'Assigned' : 'Unassigned'}
                        </span>

                        {/* Move shortcuts */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          {colIndex > 0 && (
                            <button
                              onClick={() =>
                                handleStatusChange(task, COLUMNS[colIndex - 1].id)
                              }
                              title={`Move to ${COLUMNS[colIndex - 1].label}`}
                              aria-label={`Move ${task.title} to ${COLUMNS[colIndex - 1].label}`}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {colIndex < COLUMNS.length - 1 && (
                            <button
                              onClick={() =>
                                handleStatusChange(task, COLUMNS[colIndex + 1].id)
                              }
                              title={`Move to ${COLUMNS[colIndex + 1].label}`}
                              aria-label={`Move ${task.title} to ${COLUMNS[colIndex + 1].label}`}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Capstone Concurrency Conflict Resolution Dialog */}
      <OCCConflictModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        onRefreshAndResolve={() => {
          setIsConflictModalOpen(false);
          onTaskUpdated(); // Refresh server records to latest version
        }}
        localTask={conflictLocal}
        serverTask={conflictServer}
      />
    </div>
  );
}
