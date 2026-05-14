'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, tokenManager } from '@/lib/api-client';
import { User, UserOrganization, OrgRole, LoginRequest, RegisterRequest } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest, inviteToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Active organization. Resolved from the current_org_id cookie if set
  // and present in user.organizations, else the user's first membership.
  // Null when the user has zero memberships (legitimate during onboarding).
  currentOrg: UserOrganization | null;
  setCurrentOrg: (orgId: number) => void;
  // Caller's role in the active org. null when no current org.
  currentOrgRole: OrgRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// resolveActiveOrg picks the active organization for a freshly-loaded
// user. Cookie-stored choice wins if it's still a member; else default
// to the first membership (matches the backend's ResolveOrg default).
function resolveActiveOrg(orgs: UserOrganization[] | undefined): UserOrganization | null {
  if (!orgs || orgs.length === 0) return null;
  const cookieId = tokenManager.getCurrentOrgId();
  if (cookieId) {
    const fromCookie = orgs.find((o) => String(o.id) === cookieId);
    if (fromCookie) return fromCookie;
  }
  return orgs[0];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentOrg, setCurrentOrgState] = useState<UserOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await api.users.getProfile();
      const fetched = response.data.data as User;
      setUser(fetched);
      // Resolve and persist the active org so the axios interceptor's
      // X-Org-ID header is stable across reloads.
      const active = resolveActiveOrg(fetched.organizations);
      setCurrentOrgState(active);
      if (active) {
        tokenManager.setCurrentOrg(active.id);
      } else {
        tokenManager.clearCurrentOrg();
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      tokenManager.clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (data: LoginRequest) => {
    try {
      const response = await api.auth.login(data);
      const { access_token, refresh_token, expires_in, user } = response.data.data;

      tokenManager.setTokens(access_token, refresh_token, expires_in);
      // Login's response carries only identity (no memberships) — fetchUser
      // below pulls /users/profile which carries the organizations array.
      // We set user immediately so the spinner clears, then refresh to
      // hydrate the membership list and active-org state.
      setUser(user);
      await fetchUser();

      // Redirect to dashboard or return URL
      let returnUrl = '/dashboard';
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        returnUrl = urlParams.get('returnUrl') || '/dashboard';
      }
      router.push(returnUrl);
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.response?.data?.error?.message || 'Login failed');
    }
  };

  const register = async (data: RegisterRequest, inviteToken?: string) => {
    try {
      await api.auth.register(data, inviteToken);

      // Pattern B onboarding: registration only succeeds when the user
      // arrives with a valid invitation token, so post-signup we send
      // them straight to /login. The /login page handles the
      // ?registered=true banner ("check your email to verify").
      router.push('/login?registered=true');
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw new Error(error.response?.data?.error?.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenManager.clearTokens(); // also clears current_org_id
      setUser(null);
      setCurrentOrgState(null);
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  // Switch the active organization. Updates the cookie so the axios
  // interceptor stamps the new X-Org-ID on subsequent requests, then
  // updates the in-memory state so consumers (sidebar switcher, query
  // invalidation, etc.) react. Caller is responsible for invalidating
  // any cached queries that should not leak across orgs.
  const setCurrentOrg = useCallback(
    (orgId: number) => {
      const next = user?.organizations?.find((o) => o.id === orgId) ?? null;
      if (!next) return;
      setCurrentOrgState(next);
      tokenManager.setCurrentOrg(next.id);
    },
    [user]
  );

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
    currentOrg,
    setCurrentOrg,
    currentOrgRole: currentOrg?.role ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    redirectTo?: string;
    requiredRoles?: Array<'admin' | 'user' | 'viewer'>;
  }
) {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        const currentPath = pathname;
        router.push(options?.redirectTo || `/login?returnUrl=${encodeURIComponent(currentPath)}`);
      }

      if (user && options?.requiredRoles && !options.requiredRoles.includes(user.role)) {
        router.push('/dashboard');
      }
    }, [isLoading, isAuthenticated, user, router, pathname]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-strong"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    if (options?.requiredRoles && user && !options.requiredRoles.includes(user.role)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-fg mb-2">Access Denied</h1>
            <p className="text-fg-muted">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
