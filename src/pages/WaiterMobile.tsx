import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { getBusinessDate } from '@/utils/businessDate';
import { de } from 'date-fns/locale';
import { Check, Loader2, CalendarDays } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { PerformanceCard } from '@/components/waiter/PerformanceCard';
import { TipRanking, RankingItem } from '@/components/waiter/TipRanking';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useSession, useCreateSession, useWaiterShifts, useCreateWaiterShift, useWaiterTipAverages } from '@/hooks/useSession';
import { useUpdateWaiterShiftWithAudit } from '@/hooks/useWaiterShiftAudit';
import { useWaiterRanking } from '@/hooks/useWaiterRanking';

export default function WaiterMobile() {
  const today = getBusinessDate();
  const { user } = useAuth();
  const { restaurantId } = useRestaurant();
  const staffName = user?.name || '';
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    pos_sales: 0,
    kassiert_brutto: 0,
    card_total: 0,
    hilf_mahl: 0,
    open_invoices: 0,
    cash_handed_in: 0,
  });

  // Data hooks
  const { data: session, isLoading: sessionLoading } = useSession(today, restaurantId);
  const createSession = useCreateSession();
  const { data: waiterShifts = [], isLoading: shiftsLoading } = useWaiterShifts(session?.id);
  const createWaiterShift = useCreateWaiterShift();
  const updateWaiterShift = useUpdateWaiterShiftWithAudit();
  const { data: tipAverages = {}, isLoading: averagesLoading } = useWaiterTipAverages(restaurantId);
  const { data: rankings = [], isLoading: rankingsLoading } = useWaiterRanking();

  // Find current user's shift (case-insensitive comparison)
  const myShift = useMemo(() => {
    if (!staffName || waiterShifts.length === 0) return undefined;
    return waiterShifts.find(s => s.waiter_name.toLowerCase().trim() === staffName.toLowerCase().trim());
  }, [waiterShifts, staffName]);

  // Sync form data with existing shift when data loads
  useEffect(() => {
    if (myShift && !shiftsLoading) {
      setFormData({
        pos_sales: myShift.pos_sales || 0,
        kassiert_brutto: myShift.kassiert_brutto || 0,
        card_total: myShift.card_total || 0,
        hilf_mahl: myShift.hilf_mahl || 0,
        open_invoices: myShift.open_invoices || 0,
        cash_handed_in: myShift.cash_handed_in || 0,
      });
    }
  }, [myShift, shiftsLoading]);

  // Calculate expected cash
  const expectedCash = useMemo(() => {
    return formData.kassiert_brutto + formData.hilf_mahl - formData.open_invoices - formData.card_total;
  }, [formData]);

  // Calculate kitchen tip (2% of POS sales)
  const kitchenTip = useMemo(() => {
    return formData.pos_sales * 0.02;
  }, [formData.pos_sales]);

  // Calculate current tip (rough estimate)
  const currentTip = useMemo(() => {
    return Math.max(0, formData.cash_handed_in - expectedCash - kitchenTip);
  }, [formData.cash_handed_in, expectedCash, kitchenTip]);

  // Calculate current tip percent
  const currentTipPercent = useMemo(() => {
    return formData.pos_sales > 0 ? (currentTip / formData.pos_sales) * 100 : 0;
  }, [currentTip, formData.pos_sales]);

  // Get my ranking data
  const myRankingData = useMemo(() => {
    return rankings.find(r => r.name.toLowerCase() === staffName.toLowerCase());
  }, [rankings, staffName]);

  // Get my average tip percent
  const myAvgTipPercent = useMemo(() => {
    const myAvg = tipAverages[staffName];
    return myAvg?.avgTipPercent ?? 0;
  }, [tipAverages, staffName]);

  const updateField = (field: keyof typeof formData, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleSave = async () => {
    if (!restaurantId) return;
    
    try {
      // Create session if not exists
      let sessionId = session?.id;
      if (!sessionId) {
        const newSession = await createSession.mutateAsync({ date: today, restaurantId });
        sessionId = newSession.id;
      }

      if (myShift) {
        // Update existing shift
        await updateWaiterShift.mutateAsync({
          id: myShift.id,
          sessionId,
          restaurantId: restaurantId!,
          ...formData,
        });
        toast({ title: 'Gespeichert', description: 'Deine Abrechnung wurde aktualisiert.' });
      } else {
        // Create new shift (second_waiter_name is null for self-service, participates_in_pool is always true)
        await createWaiterShift.mutateAsync({
          session_id: sessionId,
          waiter_name: staffName,
          second_waiter_name: null,
          participates_in_pool: true,
          ...formData,
        });
        toast({ title: 'Gespeichert', description: 'Deine Abrechnung wurde eingereicht.' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Speichern fehlgeschlagen.', variant: 'destructive' });
    }
  };

  const isSaving = createSession.isPending || createWaiterShift.isPending || updateWaiterShift.isPending;
  const isLoading = sessionLoading || shiftsLoading;

  // Transform rankings for TipRanking component
  const rankingItems: RankingItem[] = rankings.map(r => ({
    name: r.name,
    avgTipPercent: r.avgTipPercent,
    trend: r.trend,
    trendValue: r.trendValue,
    rank: r.rank,
  }));

  return (
    <MobileLayout>
      <div className="space-y-4">
        {/* Performance Card */}
        <PerformanceCard
          currentTipPercent={currentTipPercent}
          averageTipPercent={myAvgTipPercent}
          rank={myRankingData?.rank ?? null}
          totalWaiters={rankings.length}
          isLoading={rankingsLoading || averagesLoading}
        />

        {/* Cash Up Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="w-4 h-4" />
              Abrechnung {format(today, 'dd.MM.yyyy', { locale: de })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Umsatz (POS Sales)</Label>
                    <CurrencyInput
                      value={formData.pos_sales}
                      onChange={(v) => updateField('pos_sales', v)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Abzugebender Betrag (Kassiert Brutto)</Label>
                    <CurrencyInput
                      value={formData.kassiert_brutto}
                      onChange={(v) => updateField('kassiert_brutto', v)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Kartenzahlung</Label>
                    <CurrencyInput
                      value={formData.card_total}
                      onChange={(v) => updateField('card_total', v)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Hilf Mahl</Label>
                    <CurrencyInput
                      value={formData.hilf_mahl}
                      onChange={(v) => updateField('hilf_mahl', v)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Offene Rechnung</Label>
                    <CurrencyInput
                      value={formData.open_invoices}
                      onChange={(v) => updateField('open_invoices', v)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bargeld abgegeben</Label>
                    <CurrencyInput
                      value={formData.cash_handed_in}
                      onChange={(v) => updateField('cash_handed_in', v)}
                    />
                  </div>
                </div>

                <Separator />

                {/* Summary */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Erwartet:</span>
                    <span className="font-medium tabular-nums">{formatCurrency(expectedCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Küche (2%):</span>
                    <span className="font-medium tabular-nums">{formatCurrency(kitchenTip)}</span>
                  </div>
                  <div className="flex justify-between text-primary">
                    <span className="font-medium">Dein Trinkgeld:</span>
                    <span className="font-bold tabular-nums">{formatCurrency(currentTip)}</span>
                  </div>
                </div>

                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || !restaurantId}
                  className="w-full"
                  size="lg"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Abrechnung speichern
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Ranking */}
        <TipRanking
          rankings={rankingItems}
          currentUserName={staffName}
          isLoading={rankingsLoading}
        />
      </div>
    </MobileLayout>
  );
}
