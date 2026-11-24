'use client';

import React, { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { Mail, UserPlus, Clock, Check, Copy } from 'lucide-react';
import apiClient from '../../../../lib/api-client';

export default function InvitationsPage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [invitations, setInvitations] = useState<any[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/organizations/invitations', { email, role });
      setInvitations((prev) => [res.data.data, ...prev]);
      setEmail('');
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Failed to send invitation');
    }
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}${url}`);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Employee Invitations</h1>
        <p className="text-sm text-slate-500 mt-1">
          Invite team members to join your organization workspace.
        </p>
      </div>

      {/* Invite Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-sm text-slate-800 mb-3">Send New Invitation</h3>
        <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-700"
          >
            <option value="ADMIN">Organization Admin</option>
            <option value="MEMBER">Team Member</option>
            <option value="GUEST">Guest / Auditor</option>
          </select>
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shrink-0 shadow-xs"
          >
            Send Invite
          </button>
        </form>
      </div>

      {/* Sent Invites List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 font-bold text-sm text-slate-800">
          Recently Issued Invitations
        </div>

        {invitations.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            No invitations sent in this session yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {invitations.map((inv) => (
              <div key={inv.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{inv.email}</div>
                  <div className="text-slate-400 text-[11px]">Role: {inv.role} • Status: {inv.status}</div>
                </div>

                <button
                  type="button"
                  onClick={() => copyUrl(inv.invitationUrl, inv.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 font-medium"
                >
                  {copiedToken === inv.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied Link</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Invite Link</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
