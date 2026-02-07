import { Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PerformanceCardProps {
  currentTipPercent: number;
  averageTipPercent: number;
  rank: number | null;
  totalWaiters: number;
  isLoading?: boolean;
}

export function PerformanceCard({
  currentTipPercent,
  averageTipPercent,
  rank,
  totalWaiters,
  isLoading,
}: PerformanceCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <Skeleton className="h-6 w-32 mb-3" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getRankEmoji = (position: number | null) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return '🏆';
  };

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Deine Performance</span>
          {rank !== null && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/20 text-primary-foreground">
              <Trophy className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">
                {getRankEmoji(rank)} #{rank}
                <span className="text-muted-foreground ml-0.5">/{totalWaiters}</span>
              </span>
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-6">
          <div>
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {currentTipPercent.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">heute</span>
          </div>
          <div>
            <span className="text-lg font-medium tabular-nums text-muted-foreground">
              Ø {averageTipPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
