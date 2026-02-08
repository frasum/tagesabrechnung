import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Lock, LogOut, Loader2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export function SessionLockScreen() {
  const { user, unlockSession, logout } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-login-confirmation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            staff_id: user.staffId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const result = await response.json();
      setQrToken(result.token);
      setShowQr(true);
    } catch (error) {
      console.error('Error generating QR:', error);
      setError('QR-Code konnte nicht generiert werden');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  if (showQr && qrToken) {
    const confirmUrl = `${window.location.origin}/confirm-login/${qrToken}`;
    
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
      <div className="flex justify-center bg-white p-4 rounded-lg">
              <QRCodeSVG
                value={confirmUrl}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            <p className="text-xs text-center text-muted-foreground">
              QR-Code gültig für 2 Minuten
            </p>

            <Button
              variant="ghost"
              onClick={() => setShowQr(false)}
              className="w-full"
            >
              Zurück
            </Button>
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

            {user?.permissionLevel === 'admin' && (
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
            )}

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
