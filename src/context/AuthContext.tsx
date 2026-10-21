import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * DEMO ONLY. This is a UI placeholder, not real authentication.
 * Production must implement server-side authentication and authorisation (NFR-006, FR-023).
 */
const Ctx = createContext<{ isAdmin: boolean; signIn: () => void; signOut: () => void }>({
  isAdmin: false,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  return <Ctx.Provider value={{ isAdmin, signIn: () => setIsAdmin(true), signOut: () => setIsAdmin(false) }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
