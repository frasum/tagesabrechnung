import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Lock, LogOut, Loader2, Smartphone, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAuthHeaders } from '@/lib/authToken';

export function SessionLockScreen() {
  const { user, unlockSession, logout } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isQrConfirmed, setIsQrConfirmed] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);

  const isAdmin = user?.permissionLevel === 'admin';
  const confirmUrl = qrToken ? `${window.location.origin}/confirm-login/${qrToken}` : '';

  // Auto-generate QR for admin on mount
  useEffect(() => {
    if (isAdmin && !qrToken && !isGeneratingQr) {
      handleGenerateQr();
    }
  }, [isAdmin]);

  // Poll for QR confirmation
  useEffect(() => {
    if (!qrToken || isQrConfirmed) {
      setPollingActive(false);
      return;
    }

    setPollingActive(true);
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-login-confirmation`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ token: qrToken }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.valid) {
            setIsQrConfirmed(true);
            toast.success('QR bestätigt!');
            setTimeout(async () => {
              // Unlock session for admin
              await unlockSession('', true); // bypass PIN for QR unlock
              setQrToken(null);
              setIsQrConfirmed(false);
            }, 1500);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      setPollingActive(false);
    };
  }, [qrToken, isQrConfirmed, unlockSession]);

  const handleVerify = async () => {
    if (pin.length !== 4) {
      setError('Bitte 4-stelligen PIN eingeben');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const success = await unlockSession(pin);
      if (success) {
        toast.success('Session entsperrt');
        setPin('');
      } else {
        setError('Falscher PIN');
        setPin('');
      }
    } catch {
      setError('Fehler bei der Verifizierung');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGenerateQr = async () => {
    if (!user?.staffId) return;

    setIsGeneratingQr(true);
    setError('');

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-login-confirmation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const result = await response.json();
      setQrToken(result.token);
    } catch (error) {
      console.error('Error generating QR:', error);
      setError('QR-Code konnte nicht generiert werden');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // QR Code confirmation screen (for admin or when QR is active)
  if (qrToken) {
    if (isQrConfirmed) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4 shadow-lg">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl text-primary">Bestätigt!</CardTitle>
                <CardDescription className="mt-2">
                  QR-Code erfolgreich gescannt
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Session wird entsperrt...
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <Card className="w-full max-w-md mx-4 shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">QR-Code scannen</CardTitle>
              <CardDescription className="mt-2">
                Scanne mit deinem Handy zum Bestätigen
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex justify-center bg-white p-4 rounded-lg border-2 border-primary/20">
              <QRCodeSVG
                value={confirmUrl}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-center text-muted-foreground">
                {pollingActive ? '⏳ Warte auf Bestätigung...' : 'Scanning...'}
              </p>
              <div className="flex justify-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>

            {!isAdmin && (
              <Button
                variant="ghost"
                onClick={() => setQrToken(null)}
                className="w-full"
              >
                Zurück zur PIN-Eingabe
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Anderer Benutzer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main lock screen (Staff only - Admins always show QR)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Session gesperrt</CardTitle>
            <CardDescription className="mt-2">
              Angemeldet als <span className="font-semibold text-foreground">{user?.name}</span>
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Bitte gib deinen PIN ein, um fortzufahren
            </p>

            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={pin}
                onChange={(value: string) => {
                  setPin(value);
                  setError('');

                  // Auto-submit when 4 digits entered
                  if (value.length === 4) {
                    setTimeout(() => {
                      const submitBtn = document.getElementById('verify-pin-btn');
                      submitBtn?.click();
                    }, 100);
                  }
                }}
                disabled={isVerifying}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="w-14 h-14 text-xl" />
                  <InputOTPSlot index={1} className="w-14 h-14 text-xl" />
                  <InputOTPSlot index={2} className="w-14 h-14 text-xl" />
                  <InputOTPSlot index={3} className="w-14 h-14 text-xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && (
              <p className="text-center text-sm text-destructive">{error}</p>
            )}
          </div>

          <div className="space-y-3">
            <Button
              id="verify-pin-btn"
              onClick={handleVerify}
              disabled={isVerifying || pin.length !== 4}
              className="w-full"
              size="lg"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Prüfe...
                </>
              ) : (
                'Entsperren'
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleGenerateQr}
              disabled={isGeneratingQr}
              className="w-full"
            >
              {isGeneratingQr ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  QR generiert...
                </>
              ) : (
                <>
                  <Smartphone className="mr-2 h-4 w-4" />
                  Mit Handy bestätigen
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="w-full"
              disabled={isVerifying}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Anderer Benutzer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
