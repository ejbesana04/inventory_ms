import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Outlet, useNavigate } from "react-router-dom";
import type { User } from "../interfaces/user";
import AuthService from "../services/AuthService";
import { onSessionExpired } from "../auth/sessionEvents";
import { PATHS } from "../routes/path";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProviderLayout: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    AuthService.clearSessionRequestCache();
    const next = await AuthService.fetchCurrentUser();
    setUser(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const next = await AuthService.fetchCurrentUser();
        if (!cancelled) setUser(next);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      setUser(null);
      AuthService.clearSessionRequestCache();
      if (window.location.pathname !== PATHS.LOGIN) {
        navigate(PATHS.LOGIN, { replace: true });
      }
    });
    return unsubscribe;
  }, [navigate]);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const nextUser = await AuthService.login(email, password, remember);
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
    } catch {
      // Still clear local session if the server round-trip fails.
    } finally {
      AuthService.clearSessionRequestCache();
      setUser(null);
      navigate(PATHS.LOGIN, { replace: true });
    }
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, logout, refreshUser]
  );

  return (
    <AuthContext.Provider value={value}>
      <Outlet />
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProviderLayout");
  }
  return ctx;
}
