import { QRCodeSVG } from 'qrcode.react';
import { Utensils, Smartphone, LogIn, FileText, CheckCircle } from 'lucide-react';

const WAITER_URL = 'https://spicery.lovable.app/waiter';

export default function WaiterQRPoster() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print Button - Hidden when printing */}
      <div className="fixed top-4 right-4 z-50 print:hidden">
        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg hover:bg-primary/90 transition-colors"
        >
          🖨️ Poster drucken
        </button>
      </div>

      {/* Poster Content */}
      <div className="min-h-screen bg-white flex items-center justify-center p-8 print:p-0">
        <div className="w-full max-w-[210mm] mx-auto bg-white print:shadow-none">
          {/* Header */}
          <div className="text-center mb-8 print:mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
              <Utensils className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-2 print:text-3xl">
              Kellner Self-Service
            </h1>
            <p className="text-xl text-muted-foreground print:text-lg">
              Deine Abrechnung schnell & einfach eingeben
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-8 print:mb-6">
            <div className="p-6 bg-white border-4 border-primary/20 rounded-3xl shadow-lg print:shadow-none print:border-2">
              <QRCodeSVG
                value={WAITER_URL}
                size={220}
                level="H"
                includeMargin
              />
            </div>
          </div>

          {/* Scan Instructions */}
          <div className="text-center mb-10 print:mb-8">
            <p className="text-2xl font-semibold text-foreground mb-2 print:text-xl">
              📱 QR-Code mit dem Handy scannen
            </p>
            <p className="text-muted-foreground">
              oder direkt besuchen: <span className="font-mono font-medium text-foreground">{WAITER_URL}</span>
            </p>
          </div>

          {/* Steps */}
          <div className="bg-muted/50 rounded-2xl p-6 mb-8 print:bg-gray-50 print:mb-6">
            <h2 className="text-xl font-bold text-foreground mb-6 text-center print:text-lg">
              So funktioniert's:
            </h2>
            <div className="grid gap-4">
              {/* Step 1 */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  1
                </div>
                <div className="flex-1 pt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">QR-Code scannen</span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Öffne die Kamera-App und halte sie auf den QR-Code
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <div className="flex-1 pt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <LogIn className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">Mit deinem Namen & Code anmelden</span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Gib deinen Namen und den 4-stelligen PIN-Code ein
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <div className="flex-1 pt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">Abrechnung eingeben</span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Trage Umsatz, Kartenzahlungen und Bargeld ein
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  4
                </div>
                <div className="flex-1 pt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">Speichern – Fertig!</span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Deine Abrechnung wird sofort an den Manager übermittelt
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground border-t pt-6 print:pt-4">
            <p className="mb-1">
              <strong>Tipp:</strong> Speichere die Seite als Lesezeichen für schnellen Zugriff!
            </p>
            <p>
              Bei Fragen wende dich an den Manager.
            </p>
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
