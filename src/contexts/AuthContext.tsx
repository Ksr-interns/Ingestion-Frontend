import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  apiRequest,
  configureApi,
  getApiBaseUrl,
  setApiSession,
} from "@/services/api-client";
import type { PublicUser } from "@/types/platform";

interface AuthState {
  user: PublicUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeOrganizationId: string | null;
}

interface AuthContextValue extends AuthState {
  login: (identifier: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    username?: string,
    fullName?: string
  ) => Promise<{ user: PublicUser; message: string }>;
  verifyOtp: (email: string, otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => void;
  loginWithMicrosoft: () => void;
  requestPasswordReset: (email: string) => Promise<{ email: string; reset_token: string; message: string }>;
  confirmPasswordReset: (
    email: string,
    resetToken: string,
    newPassword: string
  ) => Promise<void>;
  setActiveOrganizationId: (id: string | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Configure API base URL from environment
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
try {
  configureApi(apiBaseUrl);
} catch {
  console.warn("Failed to configure API URL:", apiBaseUrl);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
    activeOrganizationId: null,
  });

  // Attempt session restore on mount via refresh token (cookie-based)
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const data = await apiRequest<{
          user: PublicUser;
          access_token: string;
          message: string;
        }>("/v1/auth/refresh", { method: "POST" }, false, false);

        if (cancelled) return;

        const orgId =
          data.user.memberships?.[0]?.organization_id ?? null;

        setApiSession(data.access_token, orgId);

        setState({
          user: data.user,
          accessToken: data.access_token,
          isAuthenticated: true,
          isLoading: false,
          activeOrganizationId: orgId,
        });
      } catch {
        if (cancelled) return;
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }

    if (getApiBaseUrl()) {
      restoreSession();
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const data = await apiRequest<{
        user: PublicUser;
        access_token: string;
        message: string;
      }>(
        "/v1/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ identifier, password }),
        },
        false,
        false
      );

      const orgId =
        data.user.memberships?.[0]?.organization_id ?? null;

      setApiSession(data.access_token, orgId);

      setState({
        user: data.user,
        accessToken: data.access_token,
        isAuthenticated: true,
        isLoading: false,
        activeOrganizationId: orgId,
      });
    },
    []
  );

  const signup = useCallback(
    async (
      email: string,
      password: string,
      username?: string,
      fullName?: string
    ) => {
      const data = await apiRequest<{
        user: PublicUser;
        message: string;
      }>(
        "/v1/auth/signup/init",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            username: username || undefined,
            full_name: fullName || undefined,
          }),
        },
        false,
        false
      );
      return data;
    },
    []
  );

  const verifyOtp = useCallback(
    async (email: string, otpCode: string) => {
      const data = await apiRequest<{
        user: PublicUser;
        access_token: string;
        message: string;
      }>(
        "/v1/auth/signup/verify",
        {
          method: "POST",
          body: JSON.stringify({ email, otp_code: otpCode }),
        },
        false,
        false
      );

      const orgId =
        data.user.memberships?.[0]?.organization_id ?? null;

      setApiSession(data.access_token, orgId);

      setState({
        user: data.user,
        accessToken: data.access_token,
        isAuthenticated: true,
        isLoading: false,
        activeOrganizationId: orgId,
      });
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest<{ message: string }>(
        "/v1/auth/logout",
        { method: "POST" },
        false,
        false
      );
    } catch {
      // Ignore errors — we're logging out regardless
    }
    setApiSession(null, null);
    setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      activeOrganizationId: null,
    });
  }, []);

  const loginWithGoogle = useCallback(() => {
    const base = getApiBaseUrl();
    if (base) window.location.href = `${base}/v1/auth/google`;
  }, []);

  const loginWithMicrosoft = useCallback(() => {
    const base = getApiBaseUrl();
    if (base) window.location.href = `${base}/v1/auth/microsoft`;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    return apiRequest<{ email: string; reset_token: string; message: string }>(
      "/v1/auth/password-reset/request",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
      false,
      false
    );
  }, []);

  const confirmPasswordReset = useCallback(
    async (email: string, resetToken: string, newPassword: string) => {
      await apiRequest<{ message: string }>(
        "/v1/auth/password-reset/verify",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            reset_token: resetToken,
            new_password: newPassword,
          }),
        },
        false,
        false
      );
    },
    []
  );

  const setActiveOrganizationId = useCallback(
    (id: string | null) => {
      setState((prev) => ({ ...prev, activeOrganizationId: id }));
      setApiSession(state.accessToken, id);
    },
    [state.accessToken]
  );

  const refreshUser = useCallback(async () => {
    try {
      const user = await apiRequest<PublicUser>(
        "/v1/auth/me",
        { method: "GET" },
        false,
        false
      );
      setState((prev) => ({ ...prev, user }));
    } catch {
      // silent fail
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        signup,
        verifyOtp,
        logout,
        loginWithGoogle,
        loginWithMicrosoft,
        requestPasswordReset,
        confirmPasswordReset,
        setActiveOrganizationId,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
