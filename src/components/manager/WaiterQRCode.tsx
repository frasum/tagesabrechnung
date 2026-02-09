import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Download, Copy, Check, ExternalLink, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRestaurants } from '@/hooks/useRestaurant';

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://tagesabrechnung.lovable.app';

export function WaiterQRCode() {
  const [copied, setCopied] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string>('');
  const { toast } = useToast();
  const { data: restaurants, isLoading } = useRestaurants();

  // Set default restaurant when data loads
  useEffect(() => {
    if (restaurants && restaurants.length > 0 && !selectedSlug) {
      setSelectedSlug(restaurants[0].slug);
    }
  }, [restaurants, selectedSlug]);

  const selectedRestaurant = restaurants?.find(r => r.slug === selectedSlug);
  const waiterUrl = `${BASE_URL}/${selectedSlug}/waiter`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(waiterUrl);
      setCopied(true);
      toast({ title: 'Link kopiert!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Kopieren fehlgeschlagen', variant: 'destructive' });
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('waiter-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 400, 400);
      }
      
      const link = document.createElement('a');
      link.download = `kellner-self-service-${selectedSlug}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast({ title: 'QR-Code heruntergeladen!' });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (isLoading || !selectedSlug) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-48 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Kellner Self-Service
        </CardTitle>
        <CardDescription>
          QR-Code für die mobile Kellner-Abrechnung
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Restaurant Selector */}
        <div className="space-y-2">
          <Label htmlFor="restaurant-select">Restaurant</Label>
          <Select value={selectedSlug} onValueChange={setSelectedSlug}>
            <SelectTrigger id="restaurant-select">
              <SelectValue placeholder="Restaurant wählen" />
            </SelectTrigger>
            <SelectContent>
              {restaurants?.map((restaurant) => (
                <SelectItem key={restaurant.id} value={restaurant.slug}>
                  {restaurant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Restaurant Name Banner */}
        <div className="bg-primary text-primary-foreground rounded-lg p-4 text-center">
          <p className="text-xs uppercase tracking-wider opacity-80 mb-1">QR-Code für</p>
          <h3 className="text-2xl font-display font-bold">{selectedRestaurant?.name}</h3>
        </div>

        {/* QR Code */}
        <div className="flex justify-center p-4 bg-white rounded-lg border-2 border-primary/20">
          <QRCodeSVG
            id="waiter-qr-code"
            value={waiterUrl}
            size={180}
            level="H"
            includeMargin
          />
        </div>

        {/* URL Display */}
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <code className="flex-1 text-sm truncate">{waiterUrl}</code>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyLink}
            className="shrink-0"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Actions */}
        <Button
          variant="default"
          size="sm"
          asChild
          className="w-full"
        >
          <Link to={`/${selectedSlug}/qr-poster`} target="_blank">
            <Printer className="w-4 h-4 mr-2" />
            Poster drucken
          </Link>
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Kellner können diesen QR-Code scannen und sich mit Google/Apple oder PIN anmelden, um ihre Abrechnung für {selectedRestaurant?.name} einzugeben
        </p>
      </CardContent>
    </Card>
  );
}
