import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Login() {
  const [name, setName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
      toast({
        title: 'Willkommen!',
        description: `Anmeldung erfolgreich als ${name}.`,
      });
      // Mobile users go to /waiter, desktop users go to /
      navigate(isMobile ? '/waiter' : '/');
    } else {
      toast({
        title: 'Anmeldung fehlgeschlagen',
        description: 'Name oder Code ungültig.',
        variant: 'destructive',
      });
    }
  };

  const handlePinChange = (value: string) => {
    // Only allow digits and max 4 characters
    const sanitized = value.replace(/\D/g, '').slice(0, 4);
    setPinCode(sanitized);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ChefHat className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">Spicery Abrechnung</CardTitle>
          <CardDescription>
            Bitte melden Sie sich mit Ihrem Namen und Code an
          </CardDescription>
        </CardHeader>
        <CardContent>
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
