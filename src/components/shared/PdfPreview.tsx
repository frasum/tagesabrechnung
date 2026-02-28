import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Minus, Plus, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

type PdfPreviewProps = {
  blobUrl: string;
  className?: string;
  fileName?: string;
  onPrint?: () => void;
};

export function PdfPreview({ blobUrl, className, fileName, onPrint }: PdfPreviewProps) {
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setDoc(null);
    setNumPages(0);

    (async () => {
      try {
        const res = await fetch(blobUrl);
        const data = await res.arrayBuffer();

        const task = pdfjs.getDocument({ data });
        const pdf = await task.promise;

        if (cancelled) return;
        setDoc(pdf);
        setNumPages(pdf.numPages);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "PDF konnte nicht geladen werden.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [blobUrl]);

  const registerCanvas = useCallback((pageNumber: number, canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      canvasRefs.current.set(pageNumber, canvas);
    } else {
      canvasRefs.current.delete(pageNumber);
    }
  }, []);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Popup-Fenster wurde blockiert');
      return;
    }

    // Alle Canvas-Elemente zu Data-URLs konvertieren
    const images = Array.from(canvasRefs.current.entries())
      .sort(([a], [b]) => a - b)
      .map(([_, canvas]) => canvas.toDataURL('image/png'));

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${fileName || 'PDF Druck'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: white; }
            img { 
              display: block;
              width: 100%; 
              height: auto;
            }
            @media print {
              img { 
                page-break-after: always; 
              }
              img:last-child { 
                page-break-after: avoid; 
              }
            }
          </style>
        </head>
        <body>
          ${images.map(src => `<img src="${src}" />`).join('')}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      onPrint?.();
    };
  };

  const pages = useMemo(() => Array.from({ length: numPages }, (_, i) => i + 1), [numPages]);

  if (loading) {
    return (
      <div className={cn("h-full rounded-md border p-4", className)}>
        <div className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-[70vh] w-full" />
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className={cn("h-full rounded-md border p-6", className)}>
        <p className="text-center text-muted-foreground">
          PDF konnte nicht angezeigt werden. Bitte laden Sie die Datei herunter.
        </p>
        {error ? <p className="mt-2 text-center text-xs text-muted-foreground">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-muted-foreground">
          {numPages} {numPages === 1 ? 'Seite' : 'Seiten'}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.max(0.7, Math.round((s - 0.1) * 10) / 10))}
            disabled={scale <= 0.7}
            className="gap-2"
          >
            <Minus className="h-4 w-4" />
            Zoom
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.min(2.0, Math.round((s + 0.1) * 10) / 10))}
            disabled={scale >= 2.0}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Zoom
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Drucken
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-md border bg-background">
        <div className="mx-auto w-fit space-y-4 p-4">
          {pages.map((pageNumber) => (
            <PdfPage 
              key={pageNumber} 
              pdf={doc} 
              pageNumber={pageNumber} 
              scale={scale} 
              onCanvasReady={registerCanvas}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type PdfPageProps = {
  pdf: pdfjs.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  onCanvasReady: (pageNumber: number, canvas: HTMLCanvasElement | null) => void;
};

function PdfPage({ pdf, pageNumber, scale, onCanvasReady }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setRendering(true);
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const renderTask = page.render({ canvas, canvasContext: ctx, viewport });
        await renderTask.promise;
        
        // Canvas an übergeordnete Komponente melden
        if (!cancelled) {
          onCanvasReady(pageNumber, canvas);
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
      onCanvasReady(pageNumber, null);
    };
  }, [pdf, pageNumber, scale, onCanvasReady]);

  return (
    <div className="space-y-2">
      <div className="text-center text-xs text-muted-foreground">Seite {pageNumber}</div>
      <div className="relative overflow-hidden rounded-md border bg-background">
        {rendering ? <div className="absolute inset-0 grid place-items-center p-6"><Skeleton className="h-6 w-40" /></div> : null}
        <canvas ref={canvasRef} className="block h-auto w-full" />
      </div>
    </div>
  );
}
