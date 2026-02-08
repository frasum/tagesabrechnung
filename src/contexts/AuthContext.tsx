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
  isLocked: boolean;
  login: (name: string, pinCode: string) => Promise<boolean>;
  logout: () => void;
  linkAccount: (staff: { id: string; name: string; role: string }) => Promise<void>;
  hasPermission: (requiredLevel: PermissionLevel) => boolean;
  refreshPermissions: () => Promise<void>;
  lockSession: () => void;
  unlockSession: (pin: string, bypassPin?: boolean) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'spicery_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  // Convert Supabase OAuth user to AuthUser with profile data - single API call
  const convertOAuthUser = async (supabaseUser: User): Promise<AuthUser> => {
    const fallbackName = supabaseUser.user_metadata?.full_name 
      || supabaseUser.user_metadata?.name 
      || supabaseUser.email?.split('@')[0] 
      || 'Benutzer';
    
    try {
      // Single API call to get all user data including permission level
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-role?auth_user_id=${supabaseUser.id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user role');
      }

      const roleData = await response.json();

      return {
        id: roleData.staff_id || supabaseUser.id,
        name: roleData.staff_name || fallbackName,
        role: (roleData.staff_role as 'waiter' | 'kitchen') || 'waiter',
        permissionLevel: roleData.permission_level || 'staff',
        isOAuthUser: true,
        staffId: roleData.staff_id || undefined,
        needsLinking: !roleData.staff_id,
      };
    } catch (error) {
      console.error('Error in convertOAuthUser:', error);
      // Return basic user even if lookup fails
      return {
        id: supabaseUser.id,
        name: fallbackName,
        role: 'waiter',
        permissionLevel: 'staff',
        isOAuthUser: true,
        needsLinking: true,
      };
    }
  };

  // Helper function with timeout to prevent hanging (increased to 10s)
  const convertOAuthUserWithTimeout = async (supabaseUser: User, timeoutMs = 10000): Promise<AuthUser> => {
    const timeout = new Promise<AuthUser>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    );
    return Promise.race([convertOAuthUser(supabaseUser), timeout]);
  };

  useEffect(() => {
    let isMounted = true;

    // Set up Supabase auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          try {
            const authUser = await convertOAuthUserWithTimeout(session.user);
            if (isMounted) {
              console.log('✅ OAuth user logged in:', { id: authUser.id, name: authUser.name, permissionLevel: authUser.permissionLevel, staffId: authUser.staffId });
              setUser(authUser);
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
              setIsLoading(false);
            }
          } catch (error) {
            console.error('OAuth sign-in processing failed:', error);
            if (!isMounted) return;

            // Try to get cached permission level
            const cachedUser = localStorage.getItem(AUTH_STORAGE_KEY);
            let cachedPermissionLevel: PermissionLevel = 'staff';
            let cachedStaffId: string | undefined;
            let cachedNeedsLinking = true;
            if (cachedUser) {
              try {
                const parsed = JSON.parse(cachedUser);
                cachedPermissionLevel = parsed.permissionLevel || 'staff';
                cachedStaffId = parsed.staffId;
                cachedNeedsLinking = parsed.needsLinking ?? !parsed.staffId;
              } catch {}
            }

            const name = session.user.user_metadata?.full_name
              || session.user.user_metadata?.name
              || session.user.email?.split('@')[0]
              || 'Benutzer';
            const fallbackUser: AuthUser = {
              id: cachedStaffId || session.user.id,
              name,
              role: 'waiter',
              permissionLevel: cachedPermissionLevel,
              isOAuthUser: true,
              staffId: cachedStaffId,
              needsLinking: cachedNeedsLinking,
            };
            console.log('⚠️ OAuth fallback user created:', { id: fallbackUser.id, name: fallbackUser.name, permissionLevel: fallbackUser.permissionLevel, staffId: fallbackUser.staffId });
            setUser(fallbackUser);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fallbackUser));
            setIsLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null);
            localStorage.removeItem(AUTH_STORAGE_KEY);
            setIsLoading(false);
          }
        }
      }
    );

    // Then check for existing session
    const initAuth = async () => {
      try {
        // First check localStorage for PIN-based auth
        const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedUser) {
          const parsed = JSON.parse(storedUser);

          // For OAuth users, try to refresh the profile data
          if (parsed.isOAuthUser) {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                const authUser = await convertOAuthUserWithTimeout(session.user);
                if (isMounted) {
                  setUser(authUser);
                  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
                  setIsLoading(false);
                }
                return;
              }
            } catch (e) {
              console.error('OAuth session refresh failed, using cached user:', e);
            }
            // Fallback: Use cached user data if session refresh fails
            if (isMounted) {
              setUser(parsed);
              setIsLoading(false);
            }
            return;
          }

          // PIN-based user
          if (isMounted) {
            setUser(parsed);
            setIsLoading(false);
          }
          return;
        }

        // Then check Supabase session for OAuth (no localStorage data)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          try {
            const authUser = await convertOAuthUserWithTimeout(session.user);
            if (isMounted) {
              setUser(authUser);
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
              setIsLoading(false);
            }
          } catch (e) {
            console.error('OAuth user conversion failed:', e);
            // Set loading false so login page shows
            if (isMounted) {
              setIsLoading(false);
            }
          }
        } else {
          // No session found - show login
          if (isMounted) {
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
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

  const linkAccount = async (staff: { id: string; name: string; role: string }) => {
    if (user) {
      // Fetch permission level for the linked staff
      let permissionLevel: PermissionLevel = 'staff';
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-role?staff_id=${staff.id}`,
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
        console.error('Failed to fetch permission level during linking:', e);
      }

      const updatedUser: AuthUser = {
        ...user,
        id: staff.id,
        name: staff.name,
        role: staff.role as 'waiter' | 'kitchen',
        permissionLevel,
        staffId: staff.id,
        needsLinking: false,
      };
      console.log('🔗 Account linked:', { id: updatedUser.id, name: updatedUser.name, permissionLevel: updatedUser.permissionLevel, staffId: updatedUser.staffId });
      setUser(updatedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    }
  };

  // Manually refresh permissions from the server
  const refreshPermissions = async () => {
    if (!user?.staffId) return;
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-role?staff_id=${user.staffId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      if (response.ok) {
        const roleData = await response.json();
        const updatedUser = { ...user, permissionLevel: roleData.permission_level || 'staff' };
        setUser(updatedUser as AuthUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      }
    } catch (e) {
      console.error('Failed to refresh permissions:', e);
    }
  };

  // Check if user has required permission level
  const hasPermission = (requiredLevel: PermissionLevel): boolean => {
    if (!user) return false;
    return checkPermission(user.permissionLevel, requiredLevel);
  };

  // Lock the session (show lock screen)
  const lockSession = () => {
    if (user) {
      setIsLocked(true);
    }
  };

  // Unlock session with PIN verification or bypass (for QR unlock)
  const unlockSession = async (pin: string, bypassPin = false): Promise<boolean> => {
    if (!user?.staffId) return false;

    // Allow QR-based unlock to bypass PIN
    if (bypassPin) {
      setIsLocked(false);
      return true;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-session-pin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            staff_id: user.staffId,
            pin_code: pin,
          }),
        }
      );

      if (!response.ok) return false;

      const result = await response.json();
      if (result.valid) {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isLocked, login, logout, linkAccount, hasPermission, refreshPermissions, lockSession, unlockSession }}>
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
