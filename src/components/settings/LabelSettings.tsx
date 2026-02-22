import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLabels, DEFAULT_LABELS, type LabelKey, type LabelOverrides } from '@/hooks/useLabels';
import { useRestaurant } from '@/hooks/useRestaurant';
import { Save, Tag, RotateCcw, Eye, EyeOff } from 'lucide-react';

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
    title: 'Mitarbeiter',
    keys: ['open_invoices', 'hilf_mahl', 'cash_handed_in', 'kitchen_tip'],
  },
];

export function LabelSettings() {
  const { restaurantId, restaurantName } = useRestaurant();
  const { overrides, hiddenFields, saveOverrides, saveHiddenFields, isSaving, isSavingHidden, isLoading } = useLabels(restaurantId);
  const { toast } = useToast();
  const [localOverrides, setLocalOverrides] = useState<LabelOverrides>({});
  const [localHidden, setLocalHidden] = useState<LabelKey[]>([]);

  useEffect(() => {
    setLocalOverrides(overrides);
  }, [overrides]);

  useEffect(() => {
    setLocalHidden(hiddenFields);
  }, [hiddenFields]);

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

  const toggleHidden = (key: LabelKey) => {
    setLocalHidden((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (!restaurantId) return;
    try {
      await Promise.all([
        saveOverrides({ overrides: localOverrides, restaurantId }),
        saveHiddenFields({ hiddenFields: localHidden, restaurantId }),
      ]);
      toast({ title: 'Labels gespeichert' });
    } catch {
      toast({ title: 'Fehler beim Speichern', variant: 'destructive' });
    }
  };

  const handleReset = () => {
    setLocalOverrides({});
    setLocalHidden([]);
  };

  const hasChanges =
    JSON.stringify(localOverrides) !== JSON.stringify(overrides) ||
    JSON.stringify(localHidden.slice().sort()) !== JSON.stringify(hiddenFields.slice().sort());

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
          Eigene Bezeichnungen für {restaurantName || 'dieses Restaurant'} festlegen. Leere Felder verwenden den Standard-Wert. Mit dem Auge-Symbol können Felder ausgeblendet werden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {LABEL_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {group.title}
            </h3>
            <div className="space-y-2">
              {group.keys.map((key) => {
                const isHidden = localHidden.includes(key);
                return (
                  <div key={key} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
                    <span className={`text-sm ${isHidden ? 'text-muted-foreground/50 line-through' : 'text-muted-foreground'}`}>
                      {DEFAULT_LABELS[key]}
                    </span>
                    <Input
                      value={localOverrides[key] ?? ''}
                      onChange={(e) => handleChange(key, e.target.value)}
                      placeholder={DEFAULT_LABELS[key]}
                      className="h-8 text-sm"
                      disabled={isHidden}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${isHidden ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}
                      onClick={() => toggleHidden(key)}
                      title={isHidden ? 'Feld einblenden' : 'Feld ausblenden'}
                    >
                      {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} disabled={(isSaving || isSavingHidden) || !hasChanges} className="gap-2">
            <Save className="w-4 h-4" />
            Speichern
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={Object.keys(localOverrides).length === 0 && localHidden.length === 0} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Zurücksetzen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
