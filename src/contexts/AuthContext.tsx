import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "../api/auth";
import * as authApi from "../api/auth";
import { clearToken } from "../api/apiClient";

interface AuthState {
  /** null = guest or not yet resolved, User = logged in */
  user: User | null;
  /** true while we verify an existing token on mount */
  isLoading: boolean;
  /** true when user chose to browse as guest */
  isGuest: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullname: string) => Promise<void>;
  logout: () => void;
  enterAsGuest: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => {
    return localStorage.getItem("vlearn_guest") === "true";
  });

  // On mount: try to restore session from existing token
  useEffect(() => {
    const token = localStorage.getItem("vlearn_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .getMe()
      .then(setUser)
      .catch(() => {
        clearToken();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await authApi.login(email, password);
    setUser(u);
    setIsGuest(false);
    localStorage.removeItem("vlearn_guest");
  }, []);

  const register = useCallback(
    async (email: string, password: string, fullname: string) => {
      const u = await authApi.register(email, password, fullname);
      setUser(u);
      setIsGuest(false);
      localStorage.removeItem("vlearn_guest");
    },
    [],
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem("vlearn_guest");
  }, []);

  const enterAsGuest = useCallback(() => {
    setIsGuest(true);
    localStorage.setItem("vlearn_guest", "true");
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isGuest, login, register, logout, enterAsGuest }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
