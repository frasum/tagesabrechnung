import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, X, Download } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdateNotification() {
  const [showBanner, setShowBanner] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [registrationRef, setRegistrationRef] = useState<ServiceWorkerRegistration | null>(null);

  const { updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setRegistrationRef(registration);
        // Poll for updates every 5 minutes
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const checkForUpdate = useCallback(async () => {
    if (!registrationRef) return;
    setCheckingUpdate(true);
    try {
      await registrationRef.update();
    } catch (e) {
      console.error('Manual update check failed:', e);
    } finally {
      setTimeout(() => setCheckingUpdate(false), 1500);
    }
  }, [registrationRef]);

  useEffect(() => {
    if (!navigator.serviceWorker) return;

    const handleControllerChange = () => {
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 8000);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] flex justify-center animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg max-w-md w-full">
        <RefreshCw className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium flex-1">App wurde aktualisiert</span>
        <button
          onClick={() => setShowBanner(false)}
          className="p-1 rounded hover:bg-primary-foreground/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/** Standalone button to manually trigger an update check – place anywhere in the UI */
export function ManualUpdateButton() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<'idle' | 'no-update' | 'updating'>('idle');

  const handleCheck = useCallback(async () => {
    if (!navigator.serviceWorker) return;
    setChecking(true);
    setResult('idle');
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        // If a new SW is installing/waiting, an update is available
        if (reg.installing || reg.waiting) {
          setResult('updating');
        } else {
          setResult('no-update');
        }
      }
    } catch (e) {
      console.error('Update check failed:', e);
      setResult('no-update');
    } finally {
      setChecking(false);
      setTimeout(() => setResult('idle'), 4000);
    }
  }, []);

  return (
    <button
      onClick={handleCheck}
      disabled={checking}
      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors disabled:opacity-50"
    >
      <Download className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
      {checking
        ? 'Prüfe...'
        : result === 'updating'
          ? 'Update wird installiert…'
          : result === 'no-update'
            ? 'Bereits aktuell ✓'
            : 'Jetzt aktualisieren'}
    </button>
  );
}
