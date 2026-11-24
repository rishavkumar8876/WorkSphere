'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../lib/api-client';
import { useAuth } from '../../../../context/AuthContext';
import { Users, UserPlus, Mail, Shield, Plus, X } from 'lucide-react';

export default function TeamsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Fetch Members
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['org-members'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations/members');
      return res.data.data;
    },
  });

  // Fetch Teams
  const { data: teamsData } = useQuery({
    queryKey: ['org-teams'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations/teams');
      return res.data.data;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/organizations/invitations', {
        email: inviteEmail,
        role: inviteRole,
      });
    },
    onSuccess: (res: any) => {
      setFeedback(`Invitation sent! Accept URL: ${res.data?.data?.invitationUrl}`);
      setIsInviteOpen(false);
      setInviteEmail('');
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/organizations/teams', {
        name: teamName,
        description: teamDesc,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-teams'] });
      setIsTeamModalOpen(false);
      setTeamName('');
      setTeamDesc('');
    },
  });

  const members = Array.isArray(membersData) ? membersData : [];
  const teams = Array.isArray(teamsData) ? teamsData : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Teams & Employees</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage organization members, functional teams, and role assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTeamModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Team</span>
          </button>
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Employee</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} aria-label="Dismiss message" className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid: Teams on left, Members on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-900">Functional Teams</h3>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {teams.length}
            </span>
          </div>

          <div className="space-y-3">
            {teams.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                No custom teams created yet.
              </div>
            ) : (
              teams.map((t: any) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50"
                >
                  <div className="font-semibold text-sm text-slate-800">{t.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{t.description || 'General team'}</div>
                  <div className="text-[11px] text-indigo-600 font-medium mt-2">
                    {t._count?.members || 0} members assigned
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">Organization Members</h3>
            <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full">
              {members.length} Total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Member</th>
                  <th className="px-5 py-3">Platform Role</th>
                  <th className="px-5 py-3">Org Role</th>
                  <th className="px-5 py-3">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 font-bold flex items-center justify-center text-slate-700 text-xs">
                        {m.user?.firstName?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {m.user?.firstName} {m.user?.lastName}
                        </div>
                        <div className="text-slate-400 text-[11px]">{m.user?.email}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {m.user?.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{m.role}</td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Invite Employee</h3>
              <button onClick={() => setIsInviteOpen(false)} aria-label="Close dialog" className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                inviteMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="employee@company.com"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                >
                  <option value="ADMIN">Organization Admin</option>
                  <option value="MEMBER">Team Member</option>
                  <option value="GUEST">Guest / Contractor</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Create Team</h3>
              <button onClick={() => setIsTeamModalOpen(false)} aria-label="Close dialog" className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTeamMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Frontend Engineering"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  placeholder="Responsibilities of this team"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTeamMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
