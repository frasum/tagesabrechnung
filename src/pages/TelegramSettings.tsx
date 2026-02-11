import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send } from 'lucide-react';
import { useTelegramSettings } from '@/hooks/useTelegramSettings';
import { useRestaurants } from '@/hooks/useRestaurant';
import { RestaurantProvider } from '@/contexts/RestaurantContext';
import { DateProvider } from '@/contexts/DateContext';

const metricToggles = [
  { key: 'show_pos_total', label: 'Vectron (Tagesumsatz)' },
  { key: 'show_guest_count', label: 'Gäste + Durchschnittsverbrauch' },
  { key: 'show_cash_balance', label: 'Kassenbestand' },
  { key: 'show_cash_details', label: 'Bargeld-Details' },
  { key: 'show_created_by', label: 'Erstellt von' },
  { key: 'show_waiters', label: 'Kellner-Details' },
  { key: 'show_kitchen', label: 'Küche-Details' },
] as const;

type MetricKey = typeof metricToggles[number]['key'];

function TelegramSettingsContent() {
  const { settings, isLoading, save, isSaving, sendTest, isSending } = useTelegramSettings();
  const { data: restaurants = [] } = useRestaurants();

  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [excludedRestaurants, setExcludedRestaurants] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<Record<MetricKey, boolean>>({
    show_pos_total: true,
    show_guest_count: true,
    show_cash_balance: true,
    show_cash_details: true,
    show_created_by: true,
    show_waiters: true,
    show_kitchen: true,
  });
  const [testDate, setTestDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (settings) {
      setBotToken(settings.bot_token);
      setChatId(settings.chat_id);
      setExcludedRestaurants(settings.excluded_restaurants || []);
      setMetrics({
        show_pos_total: settings.show_pos_total,
        show_guest_count: settings.show_guest_count,
        show_cash_balance: settings.show_cash_balance,
        show_cash_details: settings.show_cash_details,
        show_created_by: settings.show_created_by,
        show_waiters: settings.show_waiters,
        show_kitchen: settings.show_kitchen,
      });
    }
  }, [settings]);

  const handleSave = () => {
    save({
      id: settings?.id,
      bot_token: botToken,
      chat_id: chatId,
      excluded_restaurants: excludedRestaurants,
      ...metrics,
    });
  };

  const toggleRestaurant = (id: string, checked: boolean) => {
    setExcludedRestaurants(prev =>
      checked ? [...prev, id] : prev.filter(r => r !== id)
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Telegram Einstellungen</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verbindung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-token">Bot-Token</Label>
            <Input
              id="bot-token"
              type="password"
              value={botToken}
              onChange={e => setBotToken(e.target.value)}
              placeholder="123456:ABC-DEF..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-id">Chat-ID</Label>
            <Input
              id="chat-id"
              value={chatId}
              onChange={e => setChatId(e.target.value)}
              placeholder="-1001234567890"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inhalt der Nachricht</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {metricToggles.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key}>{label}</Label>
              <Switch
                id={key}
                checked={metrics[key]}
                onCheckedChange={checked => setMetrics(prev => ({ ...prev, [key]: checked }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ausgeschlossene Restaurants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {restaurants.map(r => (
            <div key={r.id} className="flex items-center gap-3">
              <Checkbox
                id={`exclude-${r.id}`}
                checked={excludedRestaurants.includes(r.id)}
                onCheckedChange={checked => toggleRestaurant(r.id, !!checked)}
              />
              <Label htmlFor={`exclude-${r.id}`}>{r.name}</Label>
            </div>
          ))}
          {restaurants.length === 0 && (
            <p className="text-sm text-muted-foreground">Keine Restaurants gefunden.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test senden</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="space-y-2 flex-1">
              <Label htmlFor="test-date">Datum</Label>
              <Input
                id="test-date"
                type="date"
                value={testDate}
                onChange={e => setTestDate(e.target.value)}
              />
            </div>
            <Button onClick={() => sendTest(testDate)} disabled={isSending}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Senden
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Speichern
      </Button>
    </div>
  );
}

export default function TelegramSettings() {
  return (
    <RestaurantProvider>
      <DateProvider>
        <AppLayout>
          <TelegramSettingsContent />
        </AppLayout>
      </DateProvider>
    </RestaurantProvider>
  );
}
