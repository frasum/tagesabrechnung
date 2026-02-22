import { useState, useEffect } from 'react';
import { Download, Smartphone, Check, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-success" />
            </div>
            <CardTitle className="text-2xl">App installiert!</CardTitle>
            <CardDescription>
              Die Spicery Mitarbeiter App ist bereits auf deinem Gerät installiert.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/waiter'} className="w-full">
              Zur App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden mb-4 shadow-lg">
            <img src="/pwa-192x192.png" alt="Spicery App Icon" className="w-full h-full" />
          </div>
          <CardTitle className="text-2xl">Spicery Mitarbeiter</CardTitle>
          <CardDescription>
            Installiere die App auf deinem Handy für schnellen Zugriff
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Android / Chrome */}
          {deferredPrompt && (
            <Button onClick={handleInstallClick} className="w-full" size="lg">
              <Download className="w-5 h-5 mr-2" />
              App installieren
            </Button>
          )}

          {/* iOS Instructions */}
          {isIOS && !deferredPrompt && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground text-sm">
                So installierst du die App auf deinem iPhone:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Share className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">1. Teilen-Button</p>
                    <p className="text-sm text-muted-foreground">
                      Tippe unten auf das Teilen-Symbol
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">2. Zum Home-Bildschirm</p>
                    <p className="text-sm text-muted-foreground">
                      Wähle "Zum Home-Bildschirm" aus
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">3. Hinzufügen</p>
                    <p className="text-sm text-muted-foreground">
                      Tippe auf "Hinzufügen"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fallback for other browsers */}
          {!isIOS && !deferredPrompt && (
            <div className="text-center space-y-3">
              <p className="text-muted-foreground text-sm">
                Öffne diese Seite in Chrome oder Safari, um die App zu installieren.
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/waiter'}>
                Weiter zur Web-Version
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
