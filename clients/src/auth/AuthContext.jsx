// SmartAid auth context. Holds the JWT + current user, hydrates from /auth/me
// on load, and logs out automatically when any authed request returns 401.
import React, {createContext, useContext, useEffect, useState, useCallback} from "react";
import {authApi} from "../api/endpoints.js";
import {getToken, setToken, clearToken} from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({children}) {
  const [user, setUser] = useState(null);
  // 'loading' while we validate an existing token, then 'authed' | 'guest'.
  const [status, setStatus] = useState(getToken() ? "loading" : "guest");

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus("guest");
  }, []);

  // Validate a persisted token on first load.
  useEffect(() => {
    if (!getToken()) return;
    authApi
      .me()
      .then((u) => {
        setUser(u);
        setStatus("authed");
      })
      .catch(() => logout());
  }, [logout]);

  // Any authed 401 (expired/invalid token) drops us back to the login screen.
  useEffect(() => {
    const onUnauth = () => logout();
    window.addEventListener("smartaid:unauthorized", onUnauth);
    return () => window.removeEventListener("smartaid:unauthorized", onUnauth);
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const {token, user: u} = await authApi.login(email, password);
    setToken(token);
    setUser(u);
    setStatus("authed");
    return u;
  }, []);

  return (
    <AuthContext.Provider value={{user, status, login, logout}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
