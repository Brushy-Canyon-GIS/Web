
import type { ReactNode } from 'react'

// AuthContext.tsx (public mode)
import { createContext, useContext } from 'react';

interface AuthContextType {
  user: { id: string; name?: string } | null;
  session: null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dummy public user provider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const dummyUser = { id: 'public', name: 'Public User' };

  return (
    <AuthContext.Provider value={{ user: dummyUser, session: null, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
