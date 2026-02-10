import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Session {
  session_date: string;
  pos_total?: number;
  terminal_1_total?: number;
  terminal_2_total?: number;
  ordersmart_revenue?: number;
  wolt_revenue?: number;
  vouchers_sold?: number;
  vouchers_redeemed?: number;
  finedine_vouchers?: number;
  vorschuss?: number;
  einladung?: number;
  sonstige_einnahme?: number;
  takeaway_total?: number;
  spicery_transactions?: number;
  card_total_gl?: number;
}

interface WaiterShift {
  waiter_name: string;
  pos_sales: number;
  kassiert_brutto: number;
  card_total: number;
  hilf_mahl: number;
  open_invoices: number;
  cash_handed_in: number;
  differenz: number;
  kitchen_tip: number;
  submitted_at?: string | null;
  updated_at?: string | null;
  participates_in_pool?: boolean;
  second_waiter_name?: string | null;
}

interface KitchenShift {
  staff_name: string;
  hours_worked: number;
}

interface Expense {
  description: string;
  amount: number;
}

interface AdvanceEntry {
  staff_name: string;
  amount: number;
}

interface PDFExportData {
  session: Session;
  waiterShifts: WaiterShift[];
  kitchenShifts: KitchenShift[];
  expenses: Expense[];
  advances?: AdvanceEntry[];
  restaurantName?: string;
  exportedBy?: string;
  labels?: Record<string, string>;
  hiddenFields?: string[];
  totals: {
    kellnerUmsatz: number;
    totalCardTotal: number;
    totalHilfMahl: number;
    totalOpenInvoices: number;
    totalKitchenTip: number;
    totalWaiterTip: number;
    totalExpenses: number;
    totalDeliveryRevenue: number;
    bargeld: number;
    posMismatch: number;
    cardTerminalMismatch: number;
    totalAdvances?: number;
    previousDeficit?: number;
  };
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

export const generateDailySummaryPDF = (data: PDFExportData): { blobUrl: string; fileName: string } => {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;
  const l = (key: string, fallback: string) => data.labels?.[key] || fallback;
  const isHidden = (key: string) => data.hiddenFields?.includes(key) ?? false;

  // ========== HEADER - centered, compact ==========
  if (data.restaurantName) {
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(data.restaurantName, pageWidth / 2, y, { align: 'center' });
    y += 8;
  }

  const dateStr = format(new Date(data.session.session_date), "EEEE, d. MMMM", { locale: de });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(dateStr, pageWidth / 2, y, { align: 'center' });

  y += 5;
  doc.setFontSize(7);
  doc.setTextColor(128);
  const exportInfo = data.exportedBy
    ? `Erstellt: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })} von ${data.exportedBy}`
    : `Erstellt: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })}`;
  doc.text(exportInfo, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0);

  y += 6;

  // ========== WARNINGS ==========
  const adjustedPosMismatch = data.totals.posMismatch - (data.session.takeaway_total || 0);
  if (Math.abs(adjustedPosMismatch) >= 0.01 || Math.abs(data.totals.cardTerminalMismatch) >= 0.01) {
    doc.setFillColor(254, 226, 226);
    doc.rect(margin, y - 3, pageWidth - 2 * margin, 10, 'F');
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    let alertText = 'ACHTUNG: ';
    if (Math.abs(adjustedPosMismatch) >= 0.01) alertText += `POS Diff: ${formatCurrency(adjustedPosMismatch)}  `;
    if (Math.abs(data.totals.cardTerminalMismatch) >= 0.01) alertText += `Terminal Diff: ${formatCurrency(data.totals.cardTerminalMismatch)}`;
    doc.text(alertText, margin + 3, y + 3);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    y += 14;
  }

  // ========== FLAT SUMMARY TABLE (Excel-style) ==========
  const terminalTotal = (data.session.terminal_1_total || 0) + (data.session.terminal_2_total || 0);
  const bargeldMitHilf = data.totals.bargeld;
  const totalHilfMahl = data.totals.totalHilfMahl;
  const bargeldOhneHilf = bargeldMitHilf - totalHilfMahl;

  const tableWidth = pageWidth - 2 * margin;
  const tableMarginLeft = margin;

  const summaryRows: any[][] = [
    ['Umsatz', formatCurrency(data.session.pos_total || 0)],
    ['KK', formatCurrency(terminalTotal)],
    [l('ordersmart_revenue', 'SoUse'), formatCurrency(data.session.ordersmart_revenue || 0)],
    [l('wolt_revenue', 'Wolt'), formatCurrency(data.session.wolt_revenue || 0)],
    ['Gutscheine', formatCurrency(data.session.vouchers_redeemed || 0)],
    ...(isHidden('finedine_vouchers') ? [] : [[l('finedine_vouchers', 'FineDine'), formatCurrency(data.session.finedine_vouchers || 0)]]),
    [l('vouchers_sold', 'Gutscheine VK'), formatCurrency(data.session.vouchers_sold || 0)],
    ['Offen', formatCurrency(data.totals.totalOpenInvoices)],
    ['Personal', formatCurrency(data.totals.totalAdvances ?? data.session.vorschuss ?? 0)],
    [l('einladung', 'Einladung'), formatCurrency(data.session.einladung || 0)],
    [l('sonstige_einnahme', 'Sonstige Einnahme'), formatCurrency(data.session.sonstige_einnahme || 0)],
    ...((data.totals.previousDeficit ?? 0) < 0 ? [['Fehlbetrag Vortag', formatCurrency(data.totals.previousDeficit!)]] : []),
    ['Bar Ausgaben', formatCurrency(data.totals.totalExpenses)],
    [l('hilf_mahl', 'HilfMahl'), formatCurrency(totalHilfMahl)],
  ];

  // Bargeld rows with highlight
  const bargeldRowIndex = summaryRows.length;
  summaryRows.push([
    { content: 'Bargeld mit HilfMahl', styles: { fontStyle: 'bold', fontSize: 11, fillColor: [255, 255, 255] as [number, number, number], lineWidth: 0.5, lineColor: [0, 0, 0] as [number, number, number] } },
    { content: formatCurrency(bargeldMitHilf), styles: { fontStyle: 'bold', fontSize: 11, fillColor: [255, 255, 255] as [number, number, number], halign: 'right', lineWidth: 0.5, lineColor: [0, 0, 0] as [number, number, number] } },
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: tableMarginLeft, right: tableMarginLeft },
    body: summaryRows,
    theme: 'plain',
    bodyStyles: { fontSize: 8, cellPadding: { top: 1, bottom: 1, left: 2, right: 2 } },
    columnStyles: { 1: { halign: 'right' as const } },
    tableWidth: tableWidth,
  });

  // ========== "ohne hilfmahl" below the Bargeld row ==========
  const tableEndY = (doc as any).lastAutoTable.finalY;
  const totalHilfMahl2 = data.totals.totalHilfMahl;
  const bargeldOhneHilf2 = bargeldMitHilf - totalHilfMahl2;

  y = tableEndY + 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ohne hilfmahl', tableMarginLeft + 2, y);
  doc.text(formatCurrency(bargeldOhneHilf2), tableMarginLeft + tableWidth - 2, y, { align: 'right' });

  y += 6;

  // ========== AUSGABEN (if any) ==========
  if (data.expenses.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: tableMarginLeft, right: tableMarginLeft },
      head: [['Ausgaben', 'Betrag']],
      body: [
        ...data.expenses.map(e => [e.description, formatCurrency(e.amount)]),
        ['Summe', formatCurrency(data.totals.totalExpenses)],
      ],
      theme: 'plain',
      headStyles: { fillColor: [241, 245, 249] as [number, number, number], fontSize: 8, fontStyle: 'bold' as const, textColor: [51, 65, 85] as [number, number, number] },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' as const } },
      tableWidth: tableWidth,
      didParseCell: (cell) => {
        if (cell.section === 'body' && cell.row.index === data.expenses.length) {
          cell.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ========== VORSCHUSS (if any) ==========
  if (data.advances && data.advances.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: tableMarginLeft, right: tableMarginLeft },
      head: [['Vorschuss', 'Betrag']],
      body: [
        ...data.advances.map(a => [a.staff_name, formatCurrency(a.amount)]),
        ['Summe', formatCurrency(data.totals.totalAdvances ?? 0)],
      ],
      theme: 'plain',
      headStyles: { fillColor: [241, 245, 249] as [number, number, number], fontSize: 8, fontStyle: 'bold' as const, textColor: [51, 65, 85] as [number, number, number] },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' as const } },
      tableWidth: tableWidth,
      didParseCell: (cell) => {
        if (cell.section === 'body' && cell.row.index === data.advances!.length) {
          cell.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ========== KELLNER-DETAILS TABLE ==========
  if (data.waiterShifts.length > 0) {
    // Calculate tip per waiter share
    const poolParticipants = data.waiterShifts.reduce((count, w) => {
      if (!w.participates_in_pool) return count;
      return count + (w.second_waiter_name ? 2 : 1);
    }, 0);
    const tipPerShare = poolParticipants > 0 ? data.totals.totalWaiterTip / poolParticipants : 0;

    const waiterRows = data.waiterShifts.flatMap(shift => {
      const isTeam = !!shift.second_waiter_name;
      const posSales = (shift.pos_sales || 0) / (isTeam ? 2 : 1);
      const waiterPoolShare = shift.participates_in_pool ? tipPerShare : 0;
      const tipPercent = posSales > 0 && shift.participates_in_pool
        ? (waiterPoolShare / posSales) * 100
        : null;

      const submittedTime = shift.submitted_at
        ? format(new Date(shift.submitted_at), 'HH:mm', { locale: de })
        : '---';

      const updatedTime = shift.updated_at
        ? format(new Date(shift.updated_at), 'HH:mm', { locale: de })
        : '---';

      const tipStr = tipPercent !== null ? tipPercent.toFixed(1).replace('.', ',') + '%' : '---';
      const tipEuro = shift.participates_in_pool ? formatCurrency(waiterPoolShare) : '---';

      const row = [shift.waiter_name, formatCurrency(posSales), submittedTime, updatedTime, tipEuro, tipStr];

      if (isTeam) {
        const row2 = [shift.second_waiter_name, formatCurrency(posSales), submittedTime, updatedTime, tipEuro, tipStr];
        return [row, row2];
      }
      return [row];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: tableMarginLeft, right: tableMarginLeft },
      head: [['Kellner', 'Umsatz', 'Abgabe', 'Geänd.', 'TG', 'TG %']],
      body: waiterRows,
      theme: 'plain',
      headStyles: { fillColor: [241, 245, 249] as [number, number, number], fontSize: 8, fontStyle: 'bold' as const, textColor: [51, 65, 85] as [number, number, number] },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' as const }, 2: { halign: 'center' as const }, 3: { halign: 'center' as const }, 4: { halign: 'right' as const }, 5: { halign: 'right' as const } },
      tableWidth: tableWidth,
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    // Trinkgeld-Aufschlüsselung
    const totalTipAll = data.totals.totalWaiterTip + data.totals.totalKitchenTip;
    const totalTipPercent = data.totals.kellnerUmsatz > 0
      ? (totalTipAll / data.totals.kellnerUmsatz) * 100
      : 0;
    y += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Kellner-Pool: ${formatCurrency(data.totals.totalWaiterTip)}`, tableMarginLeft + 2, y);
    y += 3;
    doc.text(`Küchen-Pool: ${formatCurrency(data.totals.totalKitchenTip)}`, tableMarginLeft + 2, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Ø Trinkgeld: ${formatCurrency(totalTipAll)} von ${formatCurrency(data.totals.kellnerUmsatz)} Umsatz = ${totalTipPercent.toFixed(1).replace('.', ',')}%`,
      tableMarginLeft + 2, y
    );
  }

  // ========== Footer with page numbers ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Seite ${i} von ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  doc.setTextColor(0);

  const fileName = `Tagesabrechnung_${format(new Date(data.session.session_date), 'yyyy-MM-dd')}.pdf`;
  
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
  return { blobUrl, fileName };
};

// ============================================
// Cash Balance Monthly PDF Export
// ============================================

interface CashBalanceRow {
  date: string;
  kellnerUmsatz: number;
  kreditkarten: number;
  ordersmart: number;
  wolt: number;
  gutscheineEL: number;
  finedine: number;
  gutscheineVK: number;
  einladung: number;
  offeneRE: number;
  vorschuss: number;
  ausgaben: number;
  bargeld: number;
}

interface BankDeposit {
  deposit_date: string;
  amount: number;
}

interface CashBalancePDFData {
  rows: CashBalanceRow[];
  deposits?: BankDeposit[];
  month: number; // 0-11
  year: number;
  pettyCash?: number;
  labels?: Record<string, string>;
  hiddenFields?: string[];
}

export const generateCashBalancePDF = (data: CashBalancePDFData, options?: { preview?: boolean }): { blobUrl: string; fileName: string } | void => {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const l = (key: string, fallback: string) => data.labels?.[key] || fallback;
  const isHidden = (key: string) => data.hiddenFields?.includes(key) ?? false;
  let yPos = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const monthName = format(new Date(data.year, data.month, 1), 'MMMM yyyy', { locale: de });
  doc.text(`Bargeldbestand - ${monthName}`, margin, yPos);

  yPos += 8;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128);
  doc.text(`Erstellt am: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}`, margin, yPos);
  doc.setTextColor(0);

  yPos += 10;

  // Summary section with deposits and cash balance
  const cumulativeCash = data.rows.reduce((sum, r) => sum + r.bargeld, 0);
  const cumulativeDeposits = data.deposits?.reduce((sum, d) => sum + d.amount, 0) ?? 0;
  const pettyCash = data.pettyCash ?? 0;
  const remainingCash = pettyCash + cumulativeCash - cumulativeDeposits;

  // Summary box
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Zusammenfassung', margin, yPos);
  yPos += 6;

  const summaryData = [
    ['Wechselgeld', formatCurrency(pettyCash)],
    ['Bargeld bis ' + monthName, formatCurrency(cumulativeCash)],
    ['Bankeinzahlungen (gesamt)', '-' + formatCurrency(cumulativeDeposits)],
    ['Verbleibendes Bargeld', formatCurrency(remainingCash)],
  ];

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['Position', 'Betrag']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: function(cellHookData) {
      // Bold the last row (Verbleibendes Bargeld)
      if (cellHookData.section === 'body' && cellHookData.row.index === 3) {
        cellHookData.cell.styles.fontStyle = 'bold';
        cellHookData.cell.styles.fillColor = remainingCash >= 0 ? [220, 252, 231] : [254, 226, 226];
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Bank deposits section if there are any
  if (data.deposits && data.deposits.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Bankeinzahlungen', margin, yPos);
    yPos += 6;

    const depositTableBody = data.deposits
      .filter(d => new Date(d.deposit_date) <= new Date(`${data.year}-${String(data.month + 1).padStart(2, '0')}-31`))
      .map(deposit => {
        const dateFormatted = format(new Date(deposit.deposit_date), 'dd.MM.yyyy', { locale: de });
        return [dateFormatted, formatCurrency(deposit.amount)];
      });

    if (depositTableBody.length > 0) {
      depositTableBody.push(['Gesamt', formatCurrency(cumulativeDeposits)]);

      autoTable(doc, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [['Datum', 'Betrag']],
        body: depositTableBody,
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: 'right' } },
        didParseCell: function(cellHookData) {
          if (cellHookData.section === 'body' && cellHookData.row.index === depositTableBody.length - 1) {
            cellHookData.cell.styles.fontStyle = 'bold';
            cellHookData.cell.styles.fillColor = [254, 226, 226];
          }
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // Add page break before main table
  if (yPos > 160) {
    doc.addPage();
    yPos = 20;
  }

  // Calculate totals
  const totals = {
    kellnerUmsatz: data.rows.reduce((sum, r) => sum + r.kellnerUmsatz, 0),
    kreditkarten: data.rows.reduce((sum, r) => sum + r.kreditkarten, 0),
    ordersmart: data.rows.reduce((sum, r) => sum + r.ordersmart, 0),
    wolt: data.rows.reduce((sum, r) => sum + r.wolt, 0),
    gutscheineEL: data.rows.reduce((sum, r) => sum + r.gutscheineEL, 0),
    finedine: data.rows.reduce((sum, r) => sum + r.finedine, 0),
    gutscheineVK: data.rows.reduce((sum, r) => sum + r.gutscheineVK, 0),
    einladung: data.rows.reduce((sum, r) => sum + r.einladung, 0),
    offeneRE: data.rows.reduce((sum, r) => sum + r.offeneRE, 0),
    vorschuss: data.rows.reduce((sum, r) => sum + r.vorschuss, 0),
    ausgaben: data.rows.reduce((sum, r) => sum + r.ausgaben, 0),
    bargeld: data.rows.reduce((sum, r) => sum + r.bargeld, 0),
  };

  const showFinedine = !isHidden('finedine_vouchers');

  // Table body data
  const tableBody = data.rows.map((row) => {
    const dateFormatted = format(new Date(row.date), 'EEE d.MMM', { locale: de });
    const cols = [
      dateFormatted,
      formatCurrency(row.kellnerUmsatz),
      '-' + formatCurrency(row.kreditkarten),
      '-' + formatCurrency(row.ordersmart),
      '-' + formatCurrency(row.wolt),
      '-' + formatCurrency(row.gutscheineEL),
      ...(showFinedine ? ['-' + formatCurrency(row.finedine)] : []),
      '+' + formatCurrency(row.gutscheineVK),
      '-' + formatCurrency(row.einladung),
      '-' + formatCurrency(row.offeneRE),
      '-' + formatCurrency(row.vorschuss),
      '-' + formatCurrency(row.ausgaben),
      formatCurrency(row.bargeld),
    ];
    return cols;
  });

  // Add totals row
  tableBody.push([
    'GESAMT',
    formatCurrency(totals.kellnerUmsatz),
    '-' + formatCurrency(totals.kreditkarten),
    '-' + formatCurrency(totals.ordersmart),
    '-' + formatCurrency(totals.wolt),
    '-' + formatCurrency(totals.gutscheineEL),
    ...(showFinedine ? ['-' + formatCurrency(totals.finedine)] : []),
    '+' + formatCurrency(totals.gutscheineVK),
    '-' + formatCurrency(totals.einladung),
    '-' + formatCurrency(totals.offeneRE),
    '-' + formatCurrency(totals.vorschuss),
    '-' + formatCurrency(totals.ausgaben),
    formatCurrency(totals.bargeld),
  ]);

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [[
      'Datum',
      'Tagesumsatz',
      'Kreditkarten',
      l('ordersmart_revenue', 'SoUse'),
      l('wolt_revenue', 'Wolt'),
      'Gutsch. EL',
      ...(showFinedine ? [l('finedine_vouchers', 'FineDine')] : []),
      'Gutsch. VK',
      l('einladung', 'Einladung'),
      'Offene RE',
      'Vorschuss',
      'Ausgaben',
      'Bargeld',
    ]],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: (() => {
      const bargeldIdx = showFinedine ? 12 : 11;
      const gutschVKIdx = showFinedine ? 7 : 6;
      const styles: Record<number, any> = {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right', textColor: [185, 28, 28] },
        3: { halign: 'right', textColor: [185, 28, 28] },
        4: { halign: 'right', textColor: [185, 28, 28] },
        5: { halign: 'right', textColor: [185, 28, 28] },
      };
      if (showFinedine) {
        styles[6] = { halign: 'right', textColor: [185, 28, 28] };
      }
      styles[gutschVKIdx] = { halign: 'right', textColor: [22, 101, 52] };
      for (let i = gutschVKIdx + 1; i < bargeldIdx; i++) {
        styles[i] = { halign: 'right', textColor: [185, 28, 28] };
      }
      styles[bargeldIdx] = { halign: 'right' };
      return styles;
    })(),
    didParseCell: function(cellHookData) {
      // Style the totals row
      if (cellHookData.section === 'body' && cellHookData.row.index === tableBody.length - 1) {
        cellHookData.cell.styles.fontStyle = 'bold';
        cellHookData.cell.styles.fillColor = [241, 245, 249];
      }
      // Color the Bargeld column based on value
      const bargeldColIdx = showFinedine ? 12 : 11;
      if (cellHookData.section === 'body' && cellHookData.column.index === bargeldColIdx) {
        const rowIndex = cellHookData.row.index;
        const bargeldValue = rowIndex === tableBody.length - 1 ? totals.bargeld : data.rows[rowIndex]?.bargeld ?? 0;
        if (bargeldValue >= 0) {
          cellHookData.cell.styles.textColor = [22, 101, 52];
        } else {
          cellHookData.cell.styles.textColor = [185, 28, 28];
        }
      }
    },
  });

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Seite ${i} von ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Generate filename
  const monthStr = String(data.month + 1).padStart(2, '0');
  const fileName = `Bargeldbestand_${data.year}-${monthStr}.pdf`;

  // Return blob URL for preview or save directly
  if (options?.preview) {
    const pdfBlob = doc.output('blob');
    const blob = new Blob([pdfBlob], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    return { blobUrl, fileName };
  }

  doc.save(fileName);
};
