import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { getBusinessDate } from '@/utils/businessDate';
import { de } from 'date-fns/locale';
import { Check, Loader2, CalendarDays, Link2 } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { PerformanceCard } from '@/components/waiter/PerformanceCard';
import { TipRanking, RankingItem } from '@/components/waiter/TipRanking';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useSession, useCreateSession, useWaiterShifts, useCreateWaiterShift, useWaiterTipAverages } from '@/hooks/useSession';
import { useUpdateWaiterShiftWithAudit } from '@/hooks/useWaiterShiftAudit';
import { useWaiterRanking } from '@/hooks/useWaiterRanking';
import { useLabels } from '@/hooks/useLabels';
import { AccountLinkingDialog } from '@/components/auth/AccountLinkingDialog';
import { SecondWaiterSelect } from '@/components/shared/SecondWaiterSelect';

export default function WaiterMobile() {
  const today = getBusinessDate();
  const { user, linkAccount } = useAuth();
  const { restaurantId } = useRestaurant();
  const staffName = user?.name || '';
  const { toast } = useToast();
  const { getLabel, isFieldHidden } = useLabels(restaurantId);
  const [showLinkingDialog, setShowLinkingDialog] = useState(false);
  const [secondWaiterName, setSecondWaiterName] = useState('none');

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
      setSecondWaiterName(myShift.second_waiter_name || 'none');
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
        const newSession = await createSession.mutateAsync({ date: today, restaurantId, createdByName: user?.name || undefined });
        sessionId = newSession.id;
      }

      if (myShift) {
        await updateWaiterShift.mutateAsync({
          id: myShift.id,
          sessionId,
          restaurantId: restaurantId!,
          second_waiter_name: secondWaiterName === 'none' ? null : secondWaiterName,
          ...formData,
        });
        toast({ title: 'Gespeichert', description: 'Deine Abrechnung wurde aktualisiert.' });
      } else {
        await createWaiterShift.mutateAsync({
          session_id: sessionId,
          waiter_name: staffName,
          second_waiter_name: secondWaiterName === 'none' ? null : secondWaiterName,
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
  const isSubmitted = !!(myShift && (myShift as any).submitted_at);

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
        {/* Account Linking Prompt for OAuth users */}
        {user?.isOAuthUser && user?.needsLinking && (
          <Alert className="border-primary/50 bg-primary/5">
            <Link2 className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-2">
              <span className="text-sm">
                Verknüpfe dein Konto mit deinem Mitarbeiter-Profil
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowLinkingDialog(true)}
              >
                Verknüpfen
              </Button>
            </AlertDescription>
          </Alert>
        )}

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
                {isSubmitted && (
                  <Alert className="border-warning/50 bg-warning/10">
                    <Check className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning-foreground">
                      Deine Abrechnung wurde bereits eingereicht und kann nicht mehr geändert werden. Wende dich an einen Manager.
                    </AlertDescription>
                  </Alert>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Zweiter Kellner (optional)</Label>
                  <SecondWaiterSelect
                    value={secondWaiterName}
                    onValueChange={setSecondWaiterName}
                    excludeWaiter={staffName}
                    restaurantId={restaurantId}
                    disabled={isSubmitted}
                  />
                </div>
                <Separator />
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">{getLabel('pos_sales')}</Label>
                    <CurrencyInput
                      value={formData.pos_sales}
                      onChange={(v) => updateField('pos_sales', v)}
                      disabled={isSubmitted}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{getLabel('kassiert_brutto')}</Label>
                    <CurrencyInput
                      value={formData.kassiert_brutto}
                      onChange={(v) => updateField('kassiert_brutto', v)}
                      disabled={isSubmitted}
                    />
                  </div>
                  {!isFieldHidden('card_total_gl') && (
                  <div>
                    <Label className="text-xs text-muted-foreground">{getLabel('card_total_gl')}</Label>
                    <CurrencyInput
                      value={formData.card_total}
                      onChange={(v) => updateField('card_total', v)}
                      disabled={isSubmitted}
                    />
                  </div>
                  )}
                  {!isFieldHidden('hilf_mahl') && (
                  <div>
                    <Label className="text-xs text-muted-foreground">{getLabel('hilf_mahl')}</Label>
                    <CurrencyInput
                      value={formData.hilf_mahl}
                      onChange={(v) => updateField('hilf_mahl', v)}
                      disabled={isSubmitted}
                    />
                  </div>
                  )}
                  {!isFieldHidden('open_invoices') && (
                  <div>
                    <Label className="text-xs text-muted-foreground">{getLabel('open_invoices')}</Label>
                    <CurrencyInput
                      value={formData.open_invoices}
                      onChange={(v) => updateField('open_invoices', v)}
                      disabled={isSubmitted}
                    />
                  </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">{getLabel('cash_handed_in')}</Label>
                    <CurrencyInput
                      value={formData.cash_handed_in}
                      onChange={(v) => updateField('cash_handed_in', v)}
                      disabled={isSubmitted}
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

                {!isSubmitted && (
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
                )}
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

      {/* Account Linking Dialog */}
      <AccountLinkingDialog
        open={showLinkingDialog}
        onOpenChange={setShowLinkingDialog}
        onSuccess={linkAccount}
      />
    </MobileLayout>
  );
}
