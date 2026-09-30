import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch, clearToken, getStoredToken, storeToken } from "../api/client";
import type { Role, UserProfile } from "../types";

interface LoginResponse {
  token: string;
  user: UserProfile;
}

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  /** Dev-only role switcher: logs in as the seeded demo user for `role`. 404s in prod. */
  devLogin: (role: Role) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(getStoredToken()));

  useEffect(() => {
    if (!getStoredToken()) return;
    apiFetch<UserProfile>("/auth/me/")
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const { token, user: loggedInUser } = await apiFetch<LoginResponse>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    storeToken(token);
    setUser(loggedInUser);
  }

  async function devLogin(role: Role) {
    const { token, user: loggedInUser } = await apiFetch<LoginResponse>("/auth/dev-login/", {
      method: "POST",
      body: JSON.stringify({ role }),
    });
    storeToken(token);
    setUser(loggedInUser);
  }

  async function logout() {
    await apiFetch("/auth/logout/", { method: "POST" }).catch(() => undefined);
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, devLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
