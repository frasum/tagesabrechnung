import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, X, Download } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdateNotification() {
  const [showUpdatedBanner, setShowUpdatedBanner] = useState(false);
  const [registrationRef, setRegistrationRef] = useState<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setRegistrationRef(registration);
        // Poll for updates every 60 seconds
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  // Update check on tab focus
  useEffect(() => {
    if (!registrationRef) return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        registrationRef.update().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [registrationRef]);

  // Confirmation banner after the new SW takes control
  useEffect(() => {
    if (!navigator.serviceWorker) return;
    const handleControllerChange = () => {
      setShowUpdatedBanner(true);
      setTimeout(() => setShowUpdatedBanner(false), 8000);
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // "New version available" banner — visible to user with reload button
  if (needRefresh) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[100] flex justify-center animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg max-w-md w-full">
          <Download className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium flex-1">
            Neue Version verfügbar
          </span>
          <button
            onClick={() => updateServiceWorker(true)}
            className="px-3 py-1 rounded bg-primary-foreground text-primary text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Jetzt aktualisieren
          </button>
          <button
            onClick={() => setNeedRefresh(false)}
            className="p-1 rounded hover:bg-primary-foreground/20 transition-colors"
            aria-label="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Confirmation banner after update applied
  if (showUpdatedBanner) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[100] flex justify-center animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg max-w-md w-full">
          <RefreshCw className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium flex-1">App wurde aktualisiert</span>
          <button
            onClick={() => setShowUpdatedBanner(false)}
            className="p-1 rounded hover:bg-primary-foreground/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
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

/** Tiny build-time stamp for diagnosing stale clients */
export function BuildVersionStamp() {
  let label = '';
  try {
    const iso = __BUILD_TIME__;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0');
      label = `v ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  } catch {
    label = '';
  }
  if (!label) return null;
  return (
    <p className="text-[10px] text-sidebar-foreground/40 mt-1" title="Build-Zeitpunkt dieser Version">
      {label}
    </p>
  );
}
