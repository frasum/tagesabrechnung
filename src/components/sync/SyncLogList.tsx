import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { AlertTriangle, Trash2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSyncLogs, useDeleteSyncLog } from '@/hooks/useSyncLogs';
import { useRestaurant } from '@/hooks/useRestaurant';

export function SyncLogList() {
  const { restaurantId } = useRestaurant();
  const { data: logs, isLoading } = useSyncLogs(restaurantId);
  const deleteMutation = useDeleteSyncLog();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            ZT-Sync Fehler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) return null;

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          ZT-Sync Fehler
          <Badge variant="destructive" className="ml-auto">{logs.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm bg-muted/50"
          >
            <div className="space-y-1 min-w-0">
              <div className="font-medium">{log.staff_name}</div>
              <div className="text-muted-foreground flex items-center gap-1.5 flex-wrap">
                <Clock className="w-3 h-3" />
                {format(new Date(log.session_date + 'T12:00:00'), 'dd.MM.yyyy', { locale: de })}
                <span>·</span>
                <Badge variant="outline" className="text-xs">
                  {log.source === 'kitchen' ? 'Küche' : 'Service'}
                </Badge>
              </div>
              <div className="text-muted-foreground text-xs">{log.reason}</div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 flex-shrink-0"
              onClick={() => deleteMutation.mutate(log.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
