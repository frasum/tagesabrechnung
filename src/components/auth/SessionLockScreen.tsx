import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Lock, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function SessionLockScreen() {
  const { user, unlockSession, logout } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

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

  const handleSwitchUser = async () => {
    await logout();
    navigate('/login');
  };

  const handlePinChange = (value: string) => {
    setPin(value);
    setError('');
    
    // Auto-submit when 4 digits entered
    if (value.length === 4) {
      setTimeout(() => {
        const submitBtn = document.getElementById('verify-pin-btn');
        submitBtn?.click();
      }, 100);
    }
  };

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
                onChange={handlePinChange}
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
              variant="ghost"
              onClick={handleSwitchUser}
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
