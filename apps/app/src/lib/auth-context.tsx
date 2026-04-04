"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  User,
  TenantContext,
  Membership,
} from "@phone-assistant/contracts";
import { auth as authApi } from "./api";

interface AuthState {
  user: User | null;
  tenant: TenantContext | null;
  memberships: Membership[];
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenant: null,
    memberships: [],
    isLoading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await authApi.me();
      setState({
        user: res.data.user,
        tenant: res.data.tenant,
        memberships: res.data.memberships,
        isLoading: false,
        error: null,
      });
    } catch {
      setState({
        user: null,
        tenant: null,
        memberships: [],
        isLoading: false,
        error: null,
      });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login({ email, password });
      setState({
        user: res.data.user,
        tenant: res.data.tenant,
        memberships: res.data.memberships,
        isLoading: false,
        error: null,
      });
    },
    []
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({
      user: null,
      tenant: null,
      memberships: [],
      isLoading: false,
      error: null,
    });
  }, []);

  const switchTenant = useCallback(
    async (tenantId: string) => {
      await authApi.switchTenant(tenantId);
      await refresh();
    },
    [refresh]
  );

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, switchTenant, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
