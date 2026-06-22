'use client';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { apiClient, refreshTokenSilently } from "@/lib/api/apiClient";

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

export interface StoredUser {
  email: string;
  first_name: string;
  last_name: string;
  profile_url: string;
  id: string;
  subnetwork_ids: string[] | null;
  cluster_id: string;
  network_id: string | null;
  phone_number: string;
  department_id: string | null;
  country_code: string;
  role_name: string;
}

export interface LoginResponseData {
  id: string;
  email: string;
  admin_type: "cluster" | "subnetwork" | "department";
  cluster_id: string;
  cluster_name: string;
  cluster_profile_url: string;
  subnetworks: Array<{ id: string; name: string; profile_url?: string }>;
  subnetworks_departments: Record<string, string[]> | null;
  is_single_subnetwork_cluster: boolean;
  active_pages: Array<{ page: string }>;
  first_name: string;
  last_name: string;
  profile_url: string;
  phone_number: string;
  country_code: string;
  role_name: string;
  department_id: string | null;
  refresh_token?: string;
  access_token?: string;
  network_id?: string;
  subnetwork_ids?: string[];
}

interface AuthContextType {
  getUserId: () => string | null;
  getUser: () => StoredUser | null;
  getUserEmail: () => string | null;
  setUser: (data: LoginResponseData) => void;
  logout: () => Promise<void>;
  getNetworkId: () => string | null;
}

/* -------------------------------------------------------------------------- */
/*                                 Context                                    */
/* -------------------------------------------------------------------------- */

const AuthContext = createContext<AuthContextType>({
  getUserId: () => null,
  logout: async () => {},
  setUser: () => {},
  getUser: () => null,
  getUserEmail: () => null,
  getNetworkId: () => null,
});

const TOKEN_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/* -------------------------------------------------------------------------- */
/*                                 Provider                                   */
/* -------------------------------------------------------------------------- */

export function AuthProvider({ children }: { children: ReactNode }) {
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTokenRefreshInterval = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  const startTokenRefreshInterval = () => {
    stopTokenRefreshInterval();
    refreshIntervalRef.current = setInterval(async () => {
      if (typeof window === "undefined" || !localStorage.getItem("userId")) {
        stopTokenRefreshInterval();
        return;
      }
      try {
        await refreshTokenSilently();
      } catch {
        // Terminal session errors (SESSION_EXPIRED, INVALID_TOKEN, etc.) already
        // call forceLogout() inside the response interceptor — nothing to do here.
      }
    }, TOKEN_REFRESH_INTERVAL_MS);
  };

  // Resume the interval when the page is refreshed while already logged in
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("userId")) {
      startTokenRefreshInterval();
    }
    return () => stopTokenRefreshInterval();
  }, []);

  const getUserId = (): string | null => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("userId");
  };

  const getUser = (): StoredUser | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("user");
      return raw ? (JSON.parse(raw) as StoredUser) : null;
    } catch {
      return null;
    }
  };

  const getUserEmail = (): string | null => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("email");
  };

  const getNetworkId = (): string | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("user");
      const user = raw ? (JSON.parse(raw) as StoredUser) : null;
      return user?.network_id ?? null;
    } catch {
      return null;
    }
  };

  const setUser = (data: LoginResponseData): void => {
    const {
      email,
      last_name,
      first_name,
      cluster_id,
      subnetwork_ids,
      profile_url,
      id,
      active_pages,
      role_name,
      phone_number,
      country_code,
      network_id,
      department_id,
      refresh_token,
      access_token,
    } = data;

    const activePages = active_pages.map((p) => p.page);
    window.localStorage.setItem("activePages", JSON.stringify(activePages));
    window.localStorage.setItem("userId", id);
    window.localStorage.setItem("email", email);

    if (refresh_token) window.localStorage.setItem("refresh_token", refresh_token);
    if (access_token) window.localStorage.setItem("access_token", access_token);

    startTokenRefreshInterval();

    window.localStorage.setItem(
      "user",
      JSON.stringify({
        email,
        last_name,
        first_name,
        profile_url,
        id,
        subnetwork_ids: subnetwork_ids ?? null,
        cluster_id,
        network_id: network_id ?? null,
        phone_number,
        department_id: department_id ?? null,
        country_code,
        role_name,
      } satisfies StoredUser)
    );
  };

  const logout = async (): Promise<void> => {
    stopTokenRefreshInterval();
    try {
      await apiClient("POST", "common", "logoutuser", {
        body: null,
        shouldUseDefaultToken: false,
        enableLogging: true,
      });
    } catch {
      // Ignore API error — always clear local session
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.clear();
        window.location.pathname = "/login";
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{ getUserId, setUser, logout, getUser, getUserEmail, getNetworkId }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
