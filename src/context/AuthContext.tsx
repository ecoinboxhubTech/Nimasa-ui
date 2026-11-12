import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { adminLogin, adminLogout, adminMe, getToken, type AdminUser } from '../api/client';

/** Sign-in is real: the API issues a bearer token that is kept for the browser tab. */
const read = () => Boolean(getToken());

export type StaffRole = 'admin' | 'operator' | 'viewer';

interface AuthState {
  isAdmin: boolean;
  user?: AdminUser;
  role?: StaffRole;
  canEdit: boolean;
  canAdmin: boolean;
  /** Rejects with a user-presentable HttpError when the API refuses the credentials. */
  signIn: (email: string, password: string, totpCode?: string) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState>({ isAdmin: false, canEdit: false, canAdmin: false, signIn: async () => {}, signOut: () => {}, refresh: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(read);
  const [user, setUser] = useState<AdminUser>();

  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(undefined); setIsAdmin(false); return; }
    try { setUser(await adminMe()); }
    catch { setUser(undefined); setIsAdmin(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const signIn = useCallback(async (email: string, password: string, totpCode?: string) => {
    const u = await adminLogin(email.trim(), password, totpCode);
    setUser(u);
    setIsAdmin(true);
  }, []);

  const signOut = useCallback(() => {
    void adminLogout().catch(() => {});
    setUser(undefined);
    setIsAdmin(false);
  }, []);

  const role = user?.role;
  const canEdit = role === 'admin' || role === 'operator';
  const canAdmin = role === 'admin';
  return <Ctx.Provider value={{ isAdmin, user, role, canEdit, canAdmin, signIn, signOut, refresh }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
