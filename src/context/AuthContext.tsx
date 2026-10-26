import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { USE_API, adminLogin, adminLogout, getToken } from '../api/client';

/**
 * With `VITE_API_BASE_URL` set, sign-in is real: the API issues a bearer token that is kept for the browser tab.
 * Without it (mock mode) this is a UI placeholder only and any details sign in. Production authorisation is enforced by the server.
 */
const KEY = 'blueintel-demo-admin';
const read = () => {
  if (USE_API) return Boolean(getToken());
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
};
const write = (on: boolean) => {
  try {
    if (on) sessionStorage.setItem(KEY, '1');
    else sessionStorage.removeItem(KEY);
  } catch { /* storage unavailable */ }
};

interface AuthState {
  isAdmin: boolean;
  /** Rejects with a user-presentable Error when the API refuses the credentials. */
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthState>({ isAdmin: false, signIn: async () => {}, signOut: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(read);

  const signIn = useCallback(async (email: string, password: string) => {
    if (USE_API) await adminLogin(email.trim(), password);
    else write(true);
    setIsAdmin(true);
  }, []);

  const signOut = useCallback(() => {
    if (USE_API) void adminLogout().catch(() => {});
    else write(false);
    setIsAdmin(false);
  }, []);

  return <Ctx.Provider value={{ isAdmin, signIn, signOut }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
