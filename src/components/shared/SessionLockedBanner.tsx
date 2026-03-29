import { Lock, Unlock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface SessionLockedBannerProps {
  isUnlocked?: boolean;
  permissionLevel?: 'staff' | 'manager' | 'admin';
  onUnlock?: () => void;
  onLock?: () => void;
  unlockPending?: boolean;
}

export function SessionLockedBanner({
  isUnlocked = false,
  permissionLevel = 'staff',
  onUnlock,
  onLock,
  unlockPending = false,
}: SessionLockedBannerProps) {
  const canToggle = permissionLevel === 'admin' || permissionLevel === 'manager';

  if (isUnlocked) {
    return (
      <Alert className="border-primary/50 bg-primary/10">
        <Unlock className="h-4 w-4 text-primary" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>Diese Abrechnung wurde zur Bearbeitung freigegeben.</span>
          {canToggle && onLock && (
            <Button
              variant="outline"
              size="sm"
              onClick={onLock}
              disabled={unlockPending}
            >
              <Lock className="w-4 h-4 mr-2" />
              Wieder sperren
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-warning/50 bg-warning/10">
      <Lock className="h-4 w-4 text-warning" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>Diese Abrechnung ist schreibgeschützt.</span>
        {canToggle && onUnlock && (
          <Button
            variant="outline"
            size="sm"
            onClick={onUnlock}
            disabled={unlockPending}
          >
            <Unlock className="w-4 h-4 mr-2" />
            Zur Bearbeitung freigeben
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
