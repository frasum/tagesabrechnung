import { TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface RankingItem {
  name: string;
  avgTipPercent: number;
  trend: 'up' | 'down' | 'neutral';
  trendValue: number;
  rank: number;
}

interface TipRankingProps {
  rankings: RankingItem[];
  currentUserName: string;
  isLoading?: boolean;
}

export function TipRanking({ rankings, currentUserName, isLoading }: TipRankingProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}.`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-success" />;
    if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const formatTrend = (trend: 'up' | 'down' | 'neutral', value: number) => {
    if (trend === 'neutral') return '±0.0%';
    const sign = trend === 'up' ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="w-4 h-4" />
          Trinkgeld Ranking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rankings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Noch keine Daten vorhanden
          </p>
        ) : (
          rankings.map((item) => {
            const isCurrentUser = item.name.toLowerCase() === currentUserName.toLowerCase();
            
            return (
              <div
                key={item.name}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg transition-colors',
                  isCurrentUser 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'bg-muted/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-medium">
                    {getRankDisplay(item.rank)}
                  </span>
                  <span className={cn(
                    'font-medium',
                    isCurrentUser && 'text-primary'
                  )}>
                    {item.name}
                    {isCurrentUser && (
                      <span className="text-xs text-muted-foreground ml-1">(Du)</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">
                    {item.avgTipPercent.toFixed(1)}%
                  </span>
                  <div className={cn(
                    'flex items-center gap-1 text-xs tabular-nums',
                    item.trend === 'up' && 'text-success',
                    item.trend === 'down' && 'text-destructive',
                    item.trend === 'neutral' && 'text-muted-foreground'
                  )}>
                    {getTrendIcon(item.trend)}
                    <span>{formatTrend(item.trend, item.trendValue)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
