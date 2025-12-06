
import React, { createContext, useState, useContext, useEffect, PropsWithChildren } from 'react';
import type { User } from '../types';
import { login as loginService } from '../services/authService';
import { startSession, endSession } from '../services/activityTrackingService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren<{}>) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('oneskin-user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to parse user from session storage", e);
      sessionStorage.removeItem('oneskin-user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const loggedInUser = await loginService(email, password);
    if (loggedInUser) {
      setUser(loggedInUser);
      sessionStorage.setItem('oneskin-user', JSON.stringify(loggedInUser));

      // Start activity tracking session
      await startSession(loggedInUser.id);

      return true;
    }
    return false;
  };

  const logout = () => {
    // End activity tracking session
    endSession();

    setUser(null);
    sessionStorage.removeItem('oneskin-user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
