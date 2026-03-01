import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Lock, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { lovable } from '@/integrations/lovable/index';
import { RoleSelectionDialog, getRoleOptions, type ActiveRole } from '@/components/auth/RoleSelectionDialog';

export default function Login() {
  const [name, setName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isSupported: webAuthnSupported, hasCredential, authenticate: webAuthnAuthenticate, isLoading: webAuthnLoading } = useWebAuthn();

  // Role selection state for dual-role staff
  const [pendingRoleSelection, setPendingRoleSelection] = useState<{
    staffName: string;
    options: ReturnType<typeof getRoleOptions>;
  } | null>(null);

  const handleBiometricLogin = async () => {
    setIsLoading(true);
    const result = await webAuthnAuthenticate();
    setIsLoading(false);

    if (result.success && result.user) {
      // Use the same login flow as PIN - set user via AuthContext login-like mechanism
      const authUser = {
        id: result.user.id,
        name: result.user.name,
        role: result.user.role as 'waiter' | 'kitchen',
        permissionLevel: (result.permission_level || 'staff') as 'staff' | 'manager' | 'admin',
        staffId: result.user.id,
      };
      localStorage.setItem('spicery_auth_user', JSON.stringify(authUser));
      toast({
        title: 'Willkommen!',
        description: `Biometrische Anmeldung erfolgreich als ${result.user.name}.`,
      });
      // Force page reload to pick up the new auth state
      window.location.href = '/select-restaurant';
    } else {
      toast({
        title: 'Biometrische Anmeldung fehlgeschlagen',
        description: 'Bitte versuchen Sie es erneut oder melden Sie sich mit PIN an.',
        variant: 'destructive',
      });
    }
  };

  // Redirect if already logged in (including OAuth users)
  useEffect(() => {
    if (user && !pendingRoleSelection) {
      navigate('/select-restaurant', { replace: true });
    }
  }, [user, navigate, pendingRoleSelection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || pinCode.length !== 4) {
      toast({
        title: 'Fehler',
        description: 'Bitte Namen und 4-stelligen Code eingeben.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const success = await login(name, pinCode);
    setIsLoading(false);

    if (success) {
      // Check if user needs role selection (read from localStorage since login just stored it)
      const stored = localStorage.getItem('spicery_auth_user');
      const staffRole = stored ? JSON.parse(stored).staffRole : null;
      const roleOptions = staffRole ? getRoleOptions(staffRole) : null;

      if (roleOptions) {
        setPendingRoleSelection({ staffName: name, options: roleOptions });
        return; // Don't navigate yet – wait for role selection
      }

      toast({
        title: 'Willkommen!',
        description: `Anmeldung erfolgreich als ${name}.`,
      });
      navigate('/select-restaurant', { replace: true });
    } else {
      toast({
        title: 'Anmeldung fehlgeschlagen',
        description: 'Name oder Code ungültig.',
        variant: 'destructive',
      });
    }
  };

  const handleRoleSelected = (role: ActiveRole) => {
    // Update stored user with the selected active role
    const stored = localStorage.getItem('spicery_auth_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.role = role === 'gl' ? 'waiter' : role; // GL maps to waiter for routing
      parsed.activeRole = role; // Keep the precise selection
      // Service/Küche = nur Staff-Berechtigung, GL = Manager behalten
      if (role !== 'gl') {
        parsed.permissionLevel = 'staff';
      }
      localStorage.setItem('spicery_auth_user', JSON.stringify(parsed));
    }
    setPendingRoleSelection(null);
    toast({
      title: 'Willkommen!',
      description: `Anmeldung erfolgreich als ${pendingRoleSelection?.staffName || ''}.`,
    });
    navigate('/select-restaurant', { replace: true });
  };

  const handlePinChange = (value: string) => {
    // Only allow digits and max 4 characters
    const sanitized = value.replace(/\D/g, '').slice(0, 4);
    setPinCode(sanitized);
  };

  const startOAuthSignIn = async (provider: 'google' | 'apple') => {
    // Restaurant-Slug aus URL extrahieren falls vorhanden (für Redirect nach OAuth)
    const pathMatch = window.location.pathname.match(/^\/([^/]+)/);
    const restaurantSlug = pathMatch && pathMatch[1] !== 'login' ? pathMatch[1] : 'spicery';
    localStorage.setItem('oauth_redirect_restaurant', restaurantSlug);

    const providerLabel = provider === 'google' ? 'Google' : 'Apple';

    setIsLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        // Wichtig: Callback-Route nutzen, damit die Session aufgebaut wird, bevor die App umleitet.
        redirect_uri: `${window.location.origin}/auth/callback`,
      });

      // Wenn redirected=true, übernimmt der Browser die Navigation.
      if (result.redirected) return;

      if (result.error) {
        toast({
          title: `${providerLabel}-Anmeldung fehlgeschlagen`,
          description: result.error.message || 'Ein Fehler ist aufgetreten.',
          variant: 'destructive',
        });
      }
    } catch (e) {
      toast({
        title: `${providerLabel}-Anmeldung fehlgeschlagen`,
        description: e instanceof Error ? e.message : 'Ein Fehler ist aufgetreten.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => startOAuthSignIn('google');

  const handleAppleSignIn = () => startOAuthSignIn('apple');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {pendingRoleSelection?.options && (
        <RoleSelectionDialog
          open
          staffName={pendingRoleSelection.staffName}
          options={pendingRoleSelection.options}
          onSelect={handleRoleSelected}
        />
      )}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ChefHat className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">Tagesabrechnung</CardTitle>
          <CardDescription>
            Bitte melden Sie sich mit Ihrem Namen und Code an
          </CardDescription>
        </CardHeader>
        <CardContent>
          {webAuthnSupported && hasCredential && (
            <div className="mb-6">
              <Button
                type="button"
                className="w-full h-14 text-base"
                onClick={handleBiometricLogin}
                disabled={isLoading || webAuthnLoading}
              >
                <Fingerprint className="w-6 h-6 mr-2" />
                {isLoading ? 'Anmelden...' : 'Mit Face ID / Touch ID anmelden'}
              </Button>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-muted"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Oder mit PIN</span>
                </div>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ihr Name"
                autoComplete="username"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pinCode">4-stelliger Code</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="pinCode"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pinCode}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="••••"
                  className="pl-10 text-center tracking-[0.5em] text-lg"
                  maxLength={4}
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !name.trim() || pinCode.length !== 4}
            >
              {isLoading ? 'Anmelden...' : 'Anmelden'}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-muted"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Oder</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Mit Google anmelden
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleAppleSignIn}
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Mit Apple anmelden
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
