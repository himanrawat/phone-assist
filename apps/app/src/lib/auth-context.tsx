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
  TenantSubscription,
  EffectiveEntitlements,
  TenantUsageSummary,
} from "@phone-assistant/contracts";
import { auth as authApi } from "./api";

interface AuthState {
  user: User | null;
  tenant: TenantContext | null;
  memberships: Membership[];
  subscription: TenantSubscription | null;
  entitlements: EffectiveEntitlements | null;
  allowedLanguages: string[];
  usage: TenantUsageSummary | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    name: string;
    businessName: string;
    timezone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenant: null,
    memberships: [],
    subscription: null,
    entitlements: null,
    allowedLanguages: [],
    usage: null,
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
        subscription: res.data.subscription,
        entitlements: res.data.entitlements,
        allowedLanguages: res.data.allowedLanguages,
        usage: res.data.usage,
        isLoading: false,
        error: null,
      });
    } catch {
      setState({
        user: null,
        tenant: null,
        memberships: [],
        subscription: null,
        entitlements: null,
        allowedLanguages: [],
        usage: null,
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
        subscription: res.data.subscription,
        entitlements: res.data.entitlements,
        allowedLanguages: res.data.allowedLanguages,
        usage: res.data.usage,
        isLoading: false,
        error: null,
      });
    },
    []
  );

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      name: string;
      businessName: string;
      timezone?: string;
    }) => {
      const res = await authApi.register(input);
      setState({
        user: res.data.user,
        tenant: res.data.tenant,
        memberships: res.data.memberships,
        subscription: res.data.subscription,
        entitlements: res.data.entitlements,
        allowedLanguages: res.data.allowedLanguages,
        usage: res.data.usage,
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
      subscription: null,
      entitlements: null,
      allowedLanguages: [],
      usage: null,
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
      value={{ ...state, login, register, logout, switchTenant, refresh }}
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
