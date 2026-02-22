import { QRCodeSVG } from 'qrcode.react';
import { Utensils, Smartphone, LogIn, FileText, CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '@/hooks/useRestaurant';
import { Button } from '@/components/ui/button';

const PRODUCTION_URL = 'https://tagesabrechnung.lovable.app';

export default function WaiterQRPoster() {
  const navigate = useNavigate();
  const { restaurantSlug, restaurantName } = useRestaurant();
  const waiterUrl = `${PRODUCTION_URL}/${restaurantSlug}/waiter`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Navigation & Print Buttons - Hidden when printing */}
      <div className="fixed top-4 left-4 z-50 print:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(`/${restaurantSlug}`)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>
      <div className="fixed top-4 right-4 z-50 print:hidden">
        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg hover:bg-primary/90 transition-colors"
        >
          🖨️ Poster drucken
        </button>
      </div>

      {/* Poster Content */}
      <div className="min-h-screen bg-white flex items-center justify-center p-8 print:p-0 print:min-h-0">
        <div className="w-full max-w-[210mm] mx-auto bg-white print:shadow-none print:h-[257mm] print:flex print:flex-col print:justify-between">
          {/* Header */}
          <div className="text-center mb-6 print:mb-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-3 print:w-12 print:h-12 print:mb-2">
              <Utensils className="w-8 h-8 text-primary print:w-6 print:h-6" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-1 print:text-2xl">
              Mitarbeiter Self-Service
            </h1>
            {restaurantName && (
              <p className="text-2xl font-semibold text-primary mb-1 print:text-lg">
                {restaurantName}
              </p>
            )}
            <p className="text-xl text-muted-foreground print:text-base">
              Deine Abrechnung schnell & einfach eingeben
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6 print:mb-3">
            <div className="p-6 bg-white border-4 border-primary/20 rounded-3xl shadow-lg print:shadow-none print:border-2 print:p-4 print:rounded-2xl">
              <QRCodeSVG
                value={waiterUrl}
                size={220}
                level="H"
                includeMargin
                className="print:!w-[180px] print:!h-[180px]"
              />
            </div>
          </div>

          {/* Scan Instructions */}
          <div className="text-center mb-8 print:mb-3">
            <p className="text-2xl font-semibold text-foreground mb-1 print:text-lg">
              📱 QR-Code mit dem Handy scannen
            </p>
            <p className="text-muted-foreground print:text-sm">
              oder direkt besuchen: <span className="font-mono font-medium text-foreground">{waiterUrl}</span>
            </p>
          </div>

          {/* Steps */}
          <div className="bg-muted/50 rounded-2xl p-6 mb-8 print:bg-gray-50 print:mb-3 print:p-4 print:rounded-xl">
            <h2 className="text-xl font-bold text-foreground mb-4 text-center print:text-base print:mb-3">
              So funktioniert's:
            </h2>
            <div className="grid gap-3 print:gap-2">
              {[
                { icon: Smartphone, title: 'QR-Code scannen', desc: 'Öffne die Kamera-App und halte sie auf den QR-Code' },
                { icon: LogIn, title: 'Anmelden', desc: 'Mit Google/Apple anmelden oder Name & PIN eingeben' },
                { icon: FileText, title: 'Abrechnung eingeben', desc: 'Trage Umsatz, Kartenzahlungen und Bargeld ein' },
                { icon: CheckCircle, title: 'Speichern – Fertig!', desc: 'Deine Abrechnung wird sofort an den Manager übermittelt' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 print:gap-2">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-base print:w-8 print:h-8 print:text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 pt-1.5 print:pt-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <step.icon className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground text-sm print:text-xs">{step.title}</span>
                    </div>
                    <p className="text-muted-foreground text-sm print:text-xs">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground border-t pt-4 print:pt-2 print:text-xs">
            <p className="mb-1">
              <strong>Tipp:</strong> Speichere die Seite als Lesezeichen für schnellen Zugriff!
            </p>
            <p>Bei Fragen wende dich an den Manager.</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}
