import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdateNotification() {
  const [showBanner, setShowBanner] = useState(false);

  const { updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Poll for updates every 60 minutes
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  useEffect(() => {
    // Listen for the controlling SW change (= auto-update happened)
    if (!navigator.serviceWorker) return;

    const handleControllerChange = () => {
      setShowBanner(true);
      // Auto-hide after 8 seconds
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
