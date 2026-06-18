import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearAuthTokens,
  fetchProfile,
  getStoredAccessToken,
  getStoredRefreshToken,
  loginUser,
  logoutUser,
  setAuthTokens,
  signupUser,
} from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  async function loadProfile() {
    const access = getStoredAccessToken();

    if (!access) {
      setUser(null);
      setLoadingAuth(false);
      return null;
    }

    try {
      const profile = await fetchProfile();
      setUser(profile);
      return profile;
    } catch {
      clearAuthTokens();
      setUser(null);
      return null;
    } finally {
      setLoadingAuth(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function login(payload) {
    const result = await loginUser(payload);

    setAuthTokens({
      access: result.access,
      refresh: result.refresh,
    });

    const profile = await fetchProfile();
    setUser(profile);

    return profile;
  }

  async function signup(payload) {
    const result = await signupUser(payload);

    setAuthTokens({
      access: result.access,
      refresh: result.refresh,
    });

    setUser(result.user || null);

    if (!result.user) {
      await loadProfile();
    }

    return result;
  }

  async function logout() {
    const refresh = getStoredRefreshToken();

    try {
      if (refresh) {
        await logoutUser(refresh);
      }
    } catch {
      // Token may already be expired or blacklisted.
    } finally {
      clearAuthTokens();
      setUser(null);
    }
  }

  const value = useMemo(
    () => ({
      user,
      setUser,
      loadingAuth,
      isAuthenticated: Boolean(user && getStoredAccessToken()),
      login,
      signup,
      logout,
      refreshProfile: loadProfile,
    }),
    [user, loadingAuth],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}