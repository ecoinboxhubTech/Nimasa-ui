import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * DEMO ONLY. This is a UI placeholder, not real authentication.
 * Production must implement server-side authentication and authorisation (NFR-006, FR-023).
 */
const KEY = 'blueintel-demo-admin';
const read = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };
const write = (on: boolean) => { try { on ? sessionStorage.setItem(KEY, '1') : sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ } };

const Ctx = createContext<{ isAdmin: boolean; signIn: () => void; signOut: () => void }>({
  isAdmin: false,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(read);
  const signIn = () => { write(true); setIsAdmin(true); };
  const signOut = () => { write(false); setIsAdmin(false); };
  return <Ctx.Provider value={{ isAdmin, signIn, signOut }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
