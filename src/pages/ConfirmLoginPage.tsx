import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

export function ConfirmLoginPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('Bestätigung wird verarbeitet...');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Ungültiger Token');
      return;
    }

    const confirmLogin = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-login-confirmation`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ token }),
          }
        );

        const result = await response.json();

        if (result.valid) {
          setState('success');
          setMessage('Login bestätigt!');
          toast.success('Admin-Login erfolgreich bestätigt');
          
          // Redirect to app after 2 seconds
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else if (result.error === 'Token expired') {
          setState('expired');
          setMessage('Token abgelaufen. Bitte versuche es erneut.');
        } else {
          setState('error');
          setMessage(result.error || 'Bestätigung fehlgeschlagen');
        }
      } catch (error) {
        console.error('Error confirming login:', error);
        setState('error');
        setMessage('Ein Fehler ist aufgetreten');
      }
    };

    confirmLogin();
  }, [token, navigate]);

  const getIcon = () => {
    switch (state) {
      case 'success':
        return <CheckCircle2 className="w-12 h-12 text-green-600" />;
      case 'expired':
        return <Clock className="w-12 h-12 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="w-12 h-12 text-destructive" />;
      default:
        return <Loader2 className="w-12 h-12 text-primary animate-spin" />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            {getIcon()}
          </div>
          <div>
            <CardTitle className="text-2xl">
              {state === 'success' && 'Bestätigt!'}
              {state === 'loading' && 'Bestätigung läuft...'}
              {state === 'error' && 'Fehler'}
              {state === 'expired' && 'Token abgelaufen'}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 text-center">
          <p className="text-sm text-muted-foreground">{message}</p>

          {state === 'success' && (
            <p className="text-xs text-muted-foreground">
              Du wirst in Kürze weitergeleitet...
            </p>
          )}

          {(state === 'error' || state === 'expired') && (
            <Button
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Zurück zum Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
