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

const BASE_URL = 'https://spicery.lovable.app';

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

        {/* QR Code */}
        <div className="flex justify-center p-4 bg-white rounded-lg">
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
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadQR}
          >
            <Download className="w-4 h-4 mr-2" />
            QR laden
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a href={waiterUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Öffnen
            </a>
          </Button>
          <Button
            variant="default"
            size="sm"
            asChild
            className="col-span-2"
          >
            <Link to={`/${selectedSlug}/qr-poster`} target="_blank">
              <Printer className="w-4 h-4 mr-2" />
              Poster drucken
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Kellner können diesen QR-Code scannen, um ihre Abrechnung für {selectedRestaurant?.name} einzugeben
        </p>
      </CardContent>
    </Card>
  );
}
