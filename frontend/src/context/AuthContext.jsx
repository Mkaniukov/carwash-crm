import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";

const AuthContext = createContext(null);

function parseUserFromToken(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    const role = payload.role || (payload.role === "" ? "" : null);
    if (role == null) return null;
    return { role, token };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => parseUserFromToken(localStorage.getItem("token")));

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && !user) {
      const parsed = parseUserFromToken(token);
      if (parsed) setUser(parsed);
    }
  }, [user]);

  const login = useCallback((token) => {
    localStorage.setItem("token", token);
    const parsed = parseUserFromToken(token);
    if (parsed) setUser(parsed);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, isAuthenticated: !!user }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
