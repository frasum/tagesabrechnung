import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  name: string;
  role: 'waiter' | 'kitchen';
  isOAuthUser?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (name: string, pinCode: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'spicery_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Convert Supabase OAuth user to AuthUser
  const convertOAuthUser = (supabaseUser: User): AuthUser => {
    const name = supabaseUser.user_metadata?.full_name 
      || supabaseUser.user_metadata?.name 
      || supabaseUser.email?.split('@')[0] 
      || 'Benutzer';
    
    return {
      id: supabaseUser.id,
      name,
      role: 'waiter', // Default role for OAuth users
      isOAuthUser: true,
    };
  };

  useEffect(() => {
    // Set up Supabase auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const authUser = convertOAuthUser(session.user);
          setUser(authUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.removeItem(AUTH_STORAGE_KEY);
          setIsLoading(false);
        }
      }
    );

    // Then check for existing session
    const initAuth = async () => {
      // First check localStorage for PIN-based auth
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setIsLoading(false);
          return;
        } catch {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }

      // Then check Supabase session for OAuth
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const authUser = convertOAuthUser(session.user);
        setUser(authUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      }
      
      setIsLoading(false);
    };

    initAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (name: string, pinCode: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-pin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            pin_code: pinCode,
          }),
        }
      );

      if (!response.ok) {
        return false;
      }

      const result = await response.json();

      if (!result.success || !result.user) {
        return false;
      }

      const authUser: AuthUser = {
        id: result.user.id,
        name: result.user.name,
        role: result.user.role,
      };

      setUser(authUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    // Sign out from Supabase (for OAuth users)
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
