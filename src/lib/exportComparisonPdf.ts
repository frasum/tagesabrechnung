import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { StatsSummary, DailyStats, WaiterTipStats, KitchenTipStats } from '@/hooks/useStatistics';

interface CompareExportData {
  nameA: string;
  nameB: string;
  summaryA: StatsSummary;
  summaryB: StatsSummary;
  dailyStatsA: DailyStats[];
  dailyStatsB: DailyStats[];
  waiterTipStatsA: WaiterTipStats[];
  waiterTipStatsB: WaiterTipStats[];
  kitchenTipStatsA: KitchenTipStats[];
  kitchenTipStatsB: KitchenTipStats[];
  dateRange: { start: Date; end: Date };
}

const fmt = (value: number): string =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

const fmtPct = (val: number): string => {
  if (!isFinite(val)) return '–';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
};

export function exportComparisonPdf(data: CompareExportData): void {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Restaurant-Vergleich', pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  const rangeStr = `${format(data.dateRange.start, 'dd.MM.yyyy', { locale: de })} – ${format(data.dateRange.end, 'dd.MM.yyyy', { locale: de })}`;
  doc.text(`${data.nameA} vs. ${data.nameB}  ·  ${rangeStr}`, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0);
  y += 3;

  // Export timestamp
  doc.setFontSize(7);
  doc.setTextColor(128);
  doc.text(`Export: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}`, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0);
  y += 6;

  // Summary comparison table
  const diff = (a: number, b: number) => b !== 0 ? fmtPct(((a - b) / Math.abs(b)) * 100) : '–';

  const sA = data.summaryA;
  const sB = data.summaryB;

  const metrics = [
    ['Gesamtumsatz', fmt(sA.totalRevenue), fmt(sB.totalRevenue), diff(sA.totalRevenue, sB.totalRevenue)],
    ['Ø Tagesumsatz', fmt(sA.avgDailyRevenue), fmt(sB.avgDailyRevenue), diff(sA.avgDailyRevenue, sB.avgDailyRevenue)],
    ['Küchen Trinkgeld', fmt(sA.totalKitchenTip), fmt(sB.totalKitchenTip), diff(sA.totalKitchenTip, sB.totalKitchenTip)],
    ['Service Trinkgeld', fmt(sA.totalWaiterTip), fmt(sB.totalWaiterTip), diff(sA.totalWaiterTip, sB.totalWaiterTip)],
    ['Gesamt Trinkgeld', fmt(sA.totalKitchenTip + sA.totalWaiterTip), fmt(sB.totalKitchenTip + sB.totalWaiterTip), diff(sA.totalKitchenTip + sA.totalWaiterTip, sB.totalKitchenTip + sB.totalWaiterTip)],
    ['Lieferumsatz', fmt(sA.totalDelivery), fmt(sB.totalDelivery), diff(sA.totalDelivery, sB.totalDelivery)],
    ['Ausgaben', fmt(sA.totalExpenses), fmt(sB.totalExpenses), diff(sA.totalExpenses, sB.totalExpenses)],
    ['Tage mit Daten', String(sA.daysWithData), String(sB.daysWithData), ''],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Kennzahl', data.nameA, data.nameB, 'Differenz']],
    body: metrics,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontSize: 10, fontStyle: 'bold', textColor: 255 },
    bodyStyles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Daily revenue comparison table
  const allDates = new Set([
    ...data.dailyStatsA.map(d => d.date),
    ...data.dailyStatsB.map(d => d.date),
  ]);
  const sortedDates = Array.from(allDates).sort();
  const mapA = new Map(data.dailyStatsA.map(d => [d.date, d]));
  const mapB = new Map(data.dailyStatsB.map(d => [d.date, d]));

  const dailyRows = sortedDates.map(date => {
    const a = mapA.get(date);
    const b = mapB.get(date);
    return [
      format(new Date(date), 'dd.MM.', { locale: de }),
      a ? fmt(a.kellnerUmsatz) : '–',
      b ? fmt(b.kellnerUmsatz) : '–',
      a ? fmt(a.kitchenTip + a.waiterTip) : '–',
      b ? fmt(b.kitchenTip + b.waiterTip) : '–',
    ];
  });

  // Check if we need a new page
  if (y > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    y = 16;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Tagesvergleich', margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Datum', `Umsatz ${data.nameA}`, `Umsatz ${data.nameB}`, `TG ${data.nameA}`, `TG ${data.nameB}`]],
    body: dailyRows,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontSize: 8, fontStyle: 'bold', textColor: 255 },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Kitchen tip stats per restaurant
  const renderTipTable = (title: string, kitchen: KitchenTipStats[], waiter: WaiterTipStats[]) => {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 16;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    y += 4;

    if (kitchen.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Küche', 'Stunden', 'Trinkgeld', 'TG/Std.']],
        body: kitchen.map(k => [
          k.name,
          `${k.totalHours.toFixed(1)} Std.`,
          fmt(k.totalTip),
          fmt(k.avgTipPerHour),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94], fontSize: 9, fontStyle: 'bold', textColor: 255 },
        bodyStyles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }

    if (waiter.length > 0) {
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 16;
      }
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Service', 'Schichten', 'Pool-Anteil', 'Ø/Schicht']],
        body: waiter.map(w => [
          w.name,
          String(w.shiftsCount),
          fmt(w.totalTip),
          fmt(w.avgTipPerShift),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [168, 85, 247], fontSize: 9, fontStyle: 'bold', textColor: 255 },
        bodyStyles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  };

  renderTipTable(data.nameA, data.kitchenTipStatsA, data.waiterTipStatsA);
  renderTipTable(data.nameB, data.kitchenTipStatsB, data.waiterTipStatsB);

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Seite ${i} von ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const fileName = `Restaurant-Vergleich_${format(data.dateRange.start, 'yyyy-MM-dd')}_${format(data.dateRange.end, 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
