"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface User {
  id: string;
  username: string;
  email: string | null;
  github_id: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  loginAsGuest: () => Promise<void>;
  loginWithGitHub: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  token: null,
  loginAsGuest: async () => {},
  loginWithGitHub: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    // Check for OAuth callback token in URL
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get("auth_token");
    if (authToken) {
      // Clean the URL
      window.history.replaceState({}, "", window.location.pathname);
      localStorage.setItem("dc_token", authToken);
    }

    const savedToken = authToken || localStorage.getItem("dc_token");
    if (savedToken) {
      setToken(savedToken);
      // Validate token by fetching user info
      fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Invalid token");
        })
        .then((data) => {
          setUser(data);
        })
        .catch(() => {
          // Token is invalid, clear it
          localStorage.removeItem("dc_token");
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const loginAsGuest = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/guest`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Guest login failed");
      const data = await res.json();
      const jwt = data.access_token;
      localStorage.setItem("dc_token", jwt);
      setToken(jwt);
      setUser({ id: "guest", username: "guest", email: null, github_id: "guest" });
    } catch (err) {
      console.error("Guest login failed:", err);
      throw err;
    }
  }, []);

  const loginWithGitHub = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/callback`;
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user`;
    window.location.href = githubUrl;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("dc_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !!token,
        isLoading,
        token,
        loginAsGuest,
        loginWithGitHub,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
