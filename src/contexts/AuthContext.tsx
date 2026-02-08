import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import type { PermissionLevel } from '@/types/permissions';
import { hasPermission as checkPermission } from '@/types/permissions';

interface AuthUser {
  id: string;
  name: string;
  role: 'waiter' | 'kitchen';
  permissionLevel: PermissionLevel;
  isOAuthUser?: boolean;
  staffId?: string;
  needsLinking?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (name: string, pinCode: string) => Promise<boolean>;
  logout: () => void;
  linkAccount: (staff: { id: string; name: string; role: string }) => void;
  hasPermission: (requiredLevel: PermissionLevel) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'spicery_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Convert Supabase OAuth user to AuthUser with profile data
  const convertOAuthUser = async (supabaseUser: User): Promise<AuthUser> => {
    const name = supabaseUser.user_metadata?.full_name 
      || supabaseUser.user_metadata?.name 
      || supabaseUser.email?.split('@')[0] 
      || 'Benutzer';
    
    // Check if user has linked staff account
    const { data: profile } = await supabase
      .from('profiles')
      .select('staff_id')
      .eq('user_id', supabaseUser.id)
      .single();

    let staffData = null;
    let permissionLevel: PermissionLevel = 'staff';
    
    if (profile?.staff_id) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id, name, role')
        .eq('id', profile.staff_id)
        .single();
      staffData = staff;
      
      // Fetch permission level via edge function
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-role?staff_id=${profile.staff_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          }
        );
        if (response.ok) {
          const roleData = await response.json();
          permissionLevel = roleData.permission_level || 'staff';
        }
      } catch (e) {
        console.error('Failed to fetch permission level:', e);
      }
    }

    return {
      id: staffData?.id || supabaseUser.id,
      name: staffData?.name || name,
      role: (staffData?.role as 'waiter' | 'kitchen') || 'waiter',
      permissionLevel,
      isOAuthUser: true,
      staffId: staffData?.id,
      needsLinking: !staffData,
    };
  };

  useEffect(() => {
    // Set up Supabase auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const authUser = await convertOAuthUser(session.user);
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
          // For OAuth users, refresh the profile data
          if (parsed.isOAuthUser) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const authUser = await convertOAuthUser(session.user);
              setUser(authUser);
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
              setIsLoading(false);
              return;
            }
          }
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
        const authUser = await convertOAuthUser(session.user);
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
        permissionLevel: result.permission_level || 'staff',
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

  const linkAccount = (staff: { id: string; name: string; role: string }) => {
    if (user) {
      const updatedUser: AuthUser = {
        ...user,
        id: staff.id,
        name: staff.name,
        role: staff.role as 'waiter' | 'kitchen',
        staffId: staff.id,
        needsLinking: false,
      };
      setUser(updatedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    }
  };

  // Check if user has required permission level
  const hasPermission = (requiredLevel: PermissionLevel): boolean => {
    if (!user) return false;
    return checkPermission(user.permissionLevel, requiredLevel);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, linkAccount, hasPermission }}>
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
