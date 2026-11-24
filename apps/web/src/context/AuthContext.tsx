'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../lib/api-client';
import { UserRole } from '@worksphere/shared-types';

export interface UserSession {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string | null;
  organizationName: string | null;
  organizations?: Array<{
    id: string;
    name: string;
    slug: string;
    memberRole: string;
  }>;
}

interface AuthContextType {
  user: UserSession | null;
  activeOrgId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string; organizationId?: string }) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Rehydrate session from localStorage
    try {
      const storedUser = localStorage.getItem('ws_user');
      const storedOrg = localStorage.getItem('ws_active_org_id');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setActiveOrgId(storedOrg || parsed.organizationId || null);
      }
    } catch (e) {
      console.error('Session rehydration failed', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: { email: string; password: string; organizationId?: string }) => {
    const res = await apiClient.post('/auth/login', credentials);
    const { user: loggedInUser, tokens } = res.data.data;

    localStorage.setItem('ws_access_token', tokens.accessToken);
    localStorage.setItem('ws_refresh_token', tokens.refreshToken);
    localStorage.setItem('ws_user', JSON.stringify(loggedInUser));

    const initialOrg = loggedInUser.organizationId || (loggedInUser.organizations?.[0]?.id ?? null);
    if (initialOrg) {
      localStorage.setItem('ws_active_org_id', initialOrg);
      setActiveOrgId(initialOrg);
    }

    setUser(loggedInUser);
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
  }) => {
    const res = await apiClient.post('/auth/register', data);
    const { user: registeredUser, tokens } = res.data.data;

    localStorage.setItem('ws_access_token', tokens.accessToken);
    localStorage.setItem('ws_refresh_token', tokens.refreshToken);
    localStorage.setItem('ws_user', JSON.stringify(registeredUser));

    if (registeredUser.organizationId) {
      localStorage.setItem('ws_active_org_id', registeredUser.organizationId);
      setActiveOrgId(registeredUser.organizationId);
    }

    setUser(registeredUser);
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('ws_refresh_token');
      await apiClient.post('/auth/logout', { refreshToken });
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('ws_access_token');
      localStorage.removeItem('ws_refresh_token');
      localStorage.removeItem('ws_user');
      localStorage.removeItem('ws_active_org_id');
      setUser(null);
      setActiveOrgId(null);
      window.location.href = '/login';
    }
  };

  const switchOrganization = (orgId: string) => {
    localStorage.setItem('ws_active_org_id', orgId);
    setActiveOrgId(orgId);
    window.location.reload(); // Reload to refresh tenant data
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeOrgId,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        switchOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
