import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SessionLockedBanner() {
  return (
    <Alert className="border-warning/50 bg-warning/10">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertDescription className="text-warning-foreground">
        Diese Abrechnung ist älter als 3 Tage und kann nur von einem Admin bearbeitet werden.
      </AlertDescription>
    </Alert>
  );
}
