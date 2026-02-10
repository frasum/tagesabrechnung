import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLabels, DEFAULT_LABELS, type LabelKey, type LabelOverrides } from '@/hooks/useLabels';
import { useRestaurant } from '@/hooks/useRestaurant';
import { Save, Tag, RotateCcw } from 'lucide-react';

const LABEL_GROUPS: { title: string; keys: LabelKey[] }[] = [
  {
    title: 'Umsatz',
    keys: ['pos_total', 'pos_sales', 'kassiert_brutto'],
  },
  {
    title: 'Kredit Karten',
    keys: ['terminal_1', 'terminal_2', 'card_total_gl'],
  },
  {
    title: 'Take Away',
    keys: ['takeaway_total', 'ordersmart_revenue', 'wolt_revenue'],
  },
  {
    title: 'Gutscheine & Sonstiges',
    keys: ['vouchers_sold', 'vouchers_redeemed', 'finedine_vouchers', 'einladung', 'sonstige_einnahme'],
  },
  {
    title: 'Kellner',
    keys: ['open_invoices', 'hilf_mahl', 'cash_handed_in', 'kitchen_tip'],
  },
];

export function LabelSettings() {
  const { restaurantId, restaurantName } = useRestaurant();
  const { overrides, saveOverrides, isSaving, isLoading } = useLabels(restaurantId);
  const { toast } = useToast();
  const [localOverrides, setLocalOverrides] = useState<LabelOverrides>({});

  useEffect(() => {
    setLocalOverrides(overrides);
  }, [overrides]);

  const handleChange = (key: LabelKey, value: string) => {
    setLocalOverrides((prev) => {
      const next = { ...prev };
      if (value.trim() === '' || value.trim() === DEFAULT_LABELS[key]) {
        delete next[key];
      } else {
        next[key] = value.trim();
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!restaurantId) return;
    try {
      await saveOverrides({ overrides: localOverrides, restaurantId });
      toast({ title: 'Labels gespeichert' });
    } catch {
      toast({ title: 'Fehler beim Speichern', variant: 'destructive' });
    }
  };

  const handleReset = () => {
    setLocalOverrides({});
  };

  const hasChanges = JSON.stringify(localOverrides) !== JSON.stringify(overrides);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Laden...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Label-Verwaltung
        </CardTitle>
        <CardDescription>
          Eigene Bezeichnungen für {restaurantName || 'dieses Restaurant'} festlegen. Leere Felder verwenden den Standard-Wert.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {LABEL_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {group.title}
            </h3>
            <div className="space-y-2">
              {group.keys.map((key) => (
                <div key={key} className="grid grid-cols-[1fr_1fr] gap-3 items-center">
                  <span className="text-sm text-muted-foreground">
                    {DEFAULT_LABELS[key]}
                  </span>
                  <Input
                    value={localOverrides[key] ?? ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={DEFAULT_LABELS[key]}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving || !hasChanges} className="gap-2">
            <Save className="w-4 h-4" />
            Speichern
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={Object.keys(localOverrides).length === 0} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Zurücksetzen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
