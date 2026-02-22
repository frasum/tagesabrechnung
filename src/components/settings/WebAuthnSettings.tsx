import { useState, useEffect } from 'react';
import { Fingerprint, Trash2, Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface WebAuthnCredential {
  id: string;
  device_name: string | null;
  created_at: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function WebAuthnSettings() {
  const { user } = useAuth();
  const { isSupported, register, removeCredential: removeLocalCredential } = useWebAuthn();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const staffId = user?.staffId;

  const fetchCredentials = async () => {
    if (!staffId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/manage-webauthn?staff_id=${staffId}`,
        { headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials || []);
      }
    } catch (e) {
      console.error('Failed to fetch credentials:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, [staffId]);

  const handleRegister = async () => {
    if (!staffId) return;
    setIsRegistering(true);

    const deviceName = navigator.userAgent.includes('iPhone')
      ? 'iPhone'
      : navigator.userAgent.includes('iPad')
      ? 'iPad'
      : navigator.userAgent.includes('Android')
      ? 'Android'
      : navigator.userAgent.includes('Mac')
      ? 'Mac'
      : 'Gerät';

    const success = await register(staffId, `${deviceName} von ${user?.name}`);
    setIsRegistering(false);

    if (success) {
      toast({ title: 'Gerät registriert', description: 'Face ID / Touch ID wurde aktiviert.' });
      fetchCredentials();
    } else {
      toast({ title: 'Registrierung fehlgeschlagen', variant: 'destructive' });
    }
  };

  const handleDelete = async (credId: string) => {
    if (!staffId) return;
    setDeletingId(credId);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/manage-webauthn`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ credential_id: credId, staff_id: staffId }),
        }
      );
      if (res.ok) {
        toast({ title: 'Gerät entfernt' });
        removeLocalCredential();
        fetchCredentials();
      } else {
        toast({ title: 'Fehler beim Löschen', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Fehler beim Löschen', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  if (!isSupported) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Fingerprint className="w-4 h-4" />
          Biometrischer Login
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : credentials.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch kein Gerät registriert. Aktiviere Face ID / Touch ID für schnelleres Anmelden.
          </p>
        ) : (
          <div className="space-y-2">
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{cred.device_name || 'Unbekanntes Gerät'}</p>
                    <p className="text-xs text-muted-foreground">
                      Registriert am {format(new Date(cred.created_at), 'dd.MM.yyyy', { locale: de })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(cred.id)}
                  disabled={deletingId === cred.id}
                >
                  {deletingId === cred.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={handleRegister}
          disabled={isRegistering}
        >
          <Fingerprint className="w-4 h-4 mr-2" />
          {isRegistering ? 'Registrieren...' : 'Neues Gerät registrieren'}
        </Button>
      </CardContent>
    </Card>
  );
}
