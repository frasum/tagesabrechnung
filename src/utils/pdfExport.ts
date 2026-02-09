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
}

interface KitchenShift {
  staff_name: string;
  hours_worked: number;
}

interface Expense {
  description: string;
  amount: number;
}

interface PDFExportData {
  session: Session;
  waiterShifts: WaiterShift[];
  kitchenShifts: KitchenShift[];
  expenses: Expense[];
  restaurantName?: string;
  exportedBy?: string;
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
  };
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

export const generateDailySummaryPDF = (data: PDFExportData): void => {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const colGap = 6;
  const leftColWidth = (pageWidth - 2 * margin - colGap) * 0.38;
  const rightColX = margin + leftColWidth + colGap;
  const rightColWidth = pageWidth - rightColX - margin;
  let yLeft = 20;
  let yRight = 20;

  // ========== HEADER ==========
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TAGESABRECHNUNG', margin, yLeft);
  
  const dateStr = format(new Date(data.session.session_date), "EEEE, d. MMMM yyyy", { locale: de });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, margin, yLeft + 6);
  
  if (data.restaurantName) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(data.restaurantName, pageWidth - margin, yLeft, { align: 'right' });
  }
  
  doc.setFontSize(7);
  doc.setTextColor(128);
  const exportInfo = data.exportedBy
    ? `Erstellt: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })} von ${data.exportedBy}`
    : `Erstellt: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })}`;
  doc.text(exportInfo, pageWidth - margin, yLeft + 6, { align: 'right' });
  doc.setTextColor(0);

  yLeft += 14;
  yRight = yLeft;

  // ========== WARNINGS ==========
  const adjustedPosMismatch = data.totals.posMismatch - (data.session.takeaway_total || 0);
  if (Math.abs(adjustedPosMismatch) >= 0.01 || Math.abs(data.totals.cardTerminalMismatch) >= 0.01) {
    doc.setFillColor(254, 226, 226);
    doc.rect(margin, yLeft - 3, pageWidth - 2 * margin, 10, 'F');
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    let alertText = 'ACHTUNG: ';
    if (Math.abs(adjustedPosMismatch) >= 0.01) alertText += `POS Diff: ${formatCurrency(adjustedPosMismatch)}  `;
    if (Math.abs(data.totals.cardTerminalMismatch) >= 0.01) alertText += `Terminal Diff: ${formatCurrency(data.totals.cardTerminalMismatch)}`;
    doc.text(alertText, margin + 3, yLeft + 3);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    yLeft += 14;
    yRight = yLeft;
  }

  // ========== LEFT COLUMN: Hauptdaten ==========
  const sectionHeaderStyle = { fillColor: [241, 245, 249] as [number, number, number], fontSize: 7, fontStyle: 'bold' as const, textColor: [51, 65, 85] as [number, number, number] };
  const bodyStyle = { fontSize: 8 };
  const rightAlignCol = { 1: { halign: 'right' as const } };

  // -- Umsatz --
  autoTable(doc, {
    startY: yLeft,
    margin: { left: margin, right: pageWidth - margin - leftColWidth },
    head: [['Umsatz', '']],
    body: [
      ['Vectron Gesamtumsatz', formatCurrency(data.session.pos_total || 0)],
      ['Kellner Umsatz', formatCurrency(data.totals.kellnerUmsatz)],
      ['Differenz', formatCurrency(data.totals.posMismatch)],
    ],
    theme: 'plain',
    headStyles: sectionHeaderStyle,
    bodyStyles: bodyStyle,
    columnStyles: rightAlignCol,
    tableWidth: leftColWidth,
  });
  yLeft = (doc as any).lastAutoTable.finalY + 2;

  // -- Kredit Karten --
  const terminalTotal = (data.session.terminal_1_total || 0) + (data.session.terminal_2_total || 0);
  autoTable(doc, {
    startY: yLeft,
    margin: { left: margin, right: pageWidth - margin - leftColWidth },
    head: [['Kredit Karten', '']],
    body: [
      ['Terminal 1', formatCurrency(data.session.terminal_1_total || 0)],
      ['Terminal 2', formatCurrency(data.session.terminal_2_total || 0)],
      ['KK Umsatz GL', formatCurrency(data.session.card_total_gl || 0)],
      ['KK Gesamt', formatCurrency(data.totals.totalCardTotal)],
    ],
    theme: 'plain',
    headStyles: sectionHeaderStyle,
    bodyStyles: bodyStyle,
    columnStyles: rightAlignCol,
    tableWidth: leftColWidth,
    didParseCell: (cell) => {
      if (cell.section === 'body' && cell.row.index === 3) cell.cell.styles.fontStyle = 'bold';
    },
  });
  yLeft = (doc as any).lastAutoTable.finalY + 2;

  // -- Take Away --
  autoTable(doc, {
    startY: yLeft,
    margin: { left: margin, right: pageWidth - margin - leftColWidth },
    head: [['Take Away', '']],
    body: [
      ['Takeaway GL', formatCurrency(data.session.takeaway_total || 0)],
      ['OrderSmart', formatCurrency(data.session.ordersmart_revenue || 0)],
      ['Wolt', formatCurrency(data.session.wolt_revenue || 0)],
      ['Take-Away Gesamt', formatCurrency(data.totals.totalDeliveryRevenue)],
    ],
    theme: 'plain',
    headStyles: sectionHeaderStyle,
    bodyStyles: bodyStyle,
    columnStyles: rightAlignCol,
    tableWidth: leftColWidth,
    didParseCell: (cell) => {
      if (cell.section === 'body' && cell.row.index === 3) cell.cell.styles.fontStyle = 'bold';
    },
  });
  yLeft = (doc as any).lastAutoTable.finalY + 2;

  // -- Gutscheine & Sonstiges --
  autoTable(doc, {
    startY: yLeft,
    margin: { left: margin, right: pageWidth - margin - leftColWidth },
    head: [['Gutscheine & Sonstiges', '']],
    body: [
      ['Gutschein Verkauf', formatCurrency(data.session.vouchers_sold || 0)],
      ['Gutschein Eingelöst', formatCurrency(data.session.vouchers_redeemed || 0)],
      ['FineDine', formatCurrency(data.session.finedine_vouchers || 0)],
      ['Offene Rechnungen', formatCurrency(data.totals.totalOpenInvoices)],
      ['Vorschuss', formatCurrency(data.session.vorschuss || 0)],
      ['Einladung', formatCurrency(data.session.einladung || 0)],
      ['Sonstige Einnahmen', formatCurrency(data.session.sonstige_einnahme || 0)],
      ['Ausgaben', formatCurrency(-data.totals.totalExpenses)],
    ],
    theme: 'plain',
    headStyles: sectionHeaderStyle,
    bodyStyles: bodyStyle,
    columnStyles: rightAlignCol,
    tableWidth: leftColWidth,
  });
  yLeft = (doc as any).lastAutoTable.finalY + 2;

  // -- BARGELD (highlighted) --
  const bargeldIsPositive = data.totals.bargeld >= 0;
  const bgColor: [number, number, number] = bargeldIsPositive ? [220, 252, 231] : [254, 226, 226];
  const txtColor: [number, number, number] = bargeldIsPositive ? [22, 101, 52] : [185, 28, 28];
  
  autoTable(doc, {
    startY: yLeft,
    margin: { left: margin, right: pageWidth - margin - leftColWidth },
    body: [['BARGELD', formatCurrency(data.totals.bargeld)]],
    theme: 'plain',
    bodyStyles: { fontSize: 11, fontStyle: 'bold', fillColor: bgColor, textColor: txtColor },
    columnStyles: { 1: { halign: 'right' as const } },
    tableWidth: leftColWidth,
  });
  yLeft = (doc as any).lastAutoTable.finalY + 2;

  // -- Küchen-Trinkgeld --
  const uniqueKitchenNames = new Set(data.kitchenShifts.map(k => k.staff_name));
  const uniqueKitchenStaff = uniqueKitchenNames.size;
  const tipPerKitchen = uniqueKitchenStaff > 0 ? data.totals.totalKitchenTip / uniqueKitchenStaff : 0;

  autoTable(doc, {
    startY: yLeft,
    margin: { left: margin, right: pageWidth - margin - leftColWidth },
    body: [
      ['2% Trinkgeld Küche', formatCurrency(data.totals.totalKitchenTip)],
      ...(uniqueKitchenStaff > 0 ? [[`→ Pro Küche (${uniqueKitchenStaff} MA)`, formatCurrency(tipPerKitchen)]] : []),
    ],
    theme: 'plain',
    bodyStyles: { fontSize: 8 },
    columnStyles: rightAlignCol,
    tableWidth: leftColWidth,
    didParseCell: (cell) => {
      if (cell.section === 'body' && cell.row.index === 1) {
        cell.cell.styles.textColor = [128, 128, 128];
        cell.cell.styles.fontSize = 7;
      }
    },
  });
  yLeft = (doc as any).lastAutoTable.finalY + 4;

  // -- Ausgaben (left column, below) --
  if (data.expenses.length > 0) {
    autoTable(doc, {
      startY: yLeft,
      margin: { left: margin, right: pageWidth - margin - leftColWidth },
      head: [['Ausgaben', 'Betrag']],
      body: [
        ...data.expenses.map(e => [e.description, formatCurrency(e.amount)]),
        ['Summe', formatCurrency(data.totals.totalExpenses)],
      ],
      theme: 'plain',
      headStyles: sectionHeaderStyle,
      bodyStyles: { fontSize: 8 },
      columnStyles: rightAlignCol,
      tableWidth: leftColWidth,
      didParseCell: (cell) => {
        if (cell.section === 'body' && cell.row.index === data.expenses.length) {
          cell.cell.styles.fontStyle = 'bold';
        }
      },
    });
    yLeft = (doc as any).lastAutoTable.finalY + 4;
  }

  // ========== RIGHT COLUMN: Kellner (horizontal) ==========
  if (data.waiterShifts.length > 0) {
    const waiterNames = data.waiterShifts.map(w => w.waiter_name);
    const headRow = ['', ...waiterNames];

    const calcExpected = (w: WaiterShift) =>
      (w.kassiert_brutto || 0) + w.hilf_mahl - w.open_invoices - w.card_total;

    const bodyRows = [
      ['Abzugeben', ...data.waiterShifts.map(w => formatCurrency(w.kassiert_brutto || 0))],
      ['Kredit Karten', ...data.waiterShifts.map(w => formatCurrency(w.card_total))],
      ['Hilf Mahl', ...data.waiterShifts.map(w => formatCurrency(w.hilf_mahl))],
      ['Offene Rechn.', ...data.waiterShifts.map(w => formatCurrency(w.open_invoices))],
      ['Soll Bargeld', ...data.waiterShifts.map(w => formatCurrency(calcExpected(w)))],
      ['Abgegeben', ...data.waiterShifts.map(w => formatCurrency(w.cash_handed_in))],
      ['Küchen-TG', ...data.waiterShifts.map(w => {
        const pct = (w.kassiert_brutto || 0) > 0 ? ((w.kitchen_tip / (w.kassiert_brutto || 1)) * 100).toFixed(1) : '0.0';
        return `${formatCurrency(w.kitchen_tip)} (${pct}%)`;
      })],
      ['Kellner-TG', ...data.waiterShifts.map(w => {
        const tip = w.cash_handed_in - calcExpected(w) - w.kitchen_tip;
        return formatCurrency(tip);
      })],
    ];

    // Build column styles dynamically
    const colStyles: Record<number, { halign: 'right' | 'center' }> = {};
    for (let i = 1; i <= waiterNames.length; i++) {
      colStyles[i] = { halign: 'right' };
    }

    autoTable(doc, {
      startY: yRight,
      margin: { left: rightColX, right: margin },
      head: [headRow],
      body: bodyRows,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], fontSize: 7, halign: 'center' },
      bodyStyles: { fontSize: 7 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 28 }, ...colStyles },
      tableWidth: rightColWidth,
      didParseCell: (cell) => {
        // "Soll Bargeld" row subtle bg
        if (cell.section === 'body' && cell.row.index === 4) {
          cell.cell.styles.fillColor = [241, 245, 249];
        }
        // "Abgegeben" row bold
        if (cell.section === 'body' && cell.row.index === 5) {
          cell.cell.styles.fontStyle = 'bold';
        }
        // "Kellner-TG" row highlighted
        if (cell.section === 'body' && cell.row.index === 7) {
          cell.cell.styles.fontStyle = 'bold';
          cell.cell.styles.fillColor = [220, 252, 231];
        }
      },
    });
    yRight = (doc as any).lastAutoTable.finalY + 6;
  }

  // -- Tip Pool (right column) --
  const waiterCount = data.waiterShifts.length;
  const tipPerWaiter = waiterCount > 0 ? data.totals.totalWaiterTip / waiterCount : 0;

  autoTable(doc, {
    startY: yRight,
    margin: { left: rightColX, right: margin },
    head: [['Trinkgeld Pool', '']],
    body: [
      ['Küchen-TG Gesamt', formatCurrency(data.totals.totalKitchenTip)],
      ...(uniqueKitchenStaff > 0 ? [[`→ Küche (${uniqueKitchenStaff} MA)`, formatCurrency(tipPerKitchen)]] : []),
      ['Kellner-TG Pool', formatCurrency(data.totals.totalWaiterTip)],
      ...(waiterCount > 0 ? [[`→ Pro Kellner (${waiterCount})`, formatCurrency(tipPerWaiter)]] : []),
      ['TG Gesamt', formatCurrency(data.totals.totalKitchenTip + data.totals.totalWaiterTip)],
    ],
    theme: 'plain',
    headStyles: sectionHeaderStyle,
    bodyStyles: { fontSize: 8 },
    columnStyles: rightAlignCol,
    tableWidth: rightColWidth,
    didParseCell: (cell) => {
      if (cell.section === 'body') {
        const lastIdx = (uniqueKitchenStaff > 0 ? 1 : 0) + (waiterCount > 0 ? 1 : 0) + 3 - 1;
        if (cell.row.index === lastIdx) {
          cell.cell.styles.fontStyle = 'bold';
          cell.cell.styles.fillColor = [220, 252, 231];
        }
        // Muted sub-rows
        const raw = cell.row.raw as string[];
        if (raw && raw[0] && String(raw[0]).startsWith('→')) {
          cell.cell.styles.textColor = [128, 128, 128];
          cell.cell.styles.fontSize = 7;
        }
      }
    },
  });
  yRight = (doc as any).lastAutoTable.finalY + 6;

  // -- Kitchen staff distribution (right column) --
  if (data.kitchenShifts.length > 0) {
    const totalHours = data.kitchenShifts.reduce((sum, s) => sum + s.hours_worked, 0);

    autoTable(doc, {
      startY: yRight,
      margin: { left: rightColX, right: margin },
      head: [['Küchenpersonal', 'Stunden', 'Anteil', 'Trinkgeld']],
      body: data.kitchenShifts.map(shift => {
        const tipAmount = totalHours > 0 ? (shift.hours_worked / totalHours) * data.totals.totalKitchenTip : 0;
        const pct = totalHours > 0 ? ((shift.hours_worked / totalHours) * 100).toFixed(1) : '0';
        return [shift.staff_name, shift.hours_worked.toFixed(1) + 'h', pct + '%', formatCurrency(tipAmount)];
      }),
      theme: 'plain',
      headStyles: { ...sectionHeaderStyle, fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      tableWidth: rightColWidth,
    });
    yRight = (doc as any).lastAutoTable.finalY + 6;
  }

  // ========== FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(128);
    doc.text(
      `Seite ${i} von ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const fileName = `Tagesabrechnung_${format(new Date(data.session.session_date), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
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
}

export const generateCashBalancePDF = (data: CashBalancePDFData, options?: { preview?: boolean }): { blobUrl: string; fileName: string } | void => {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
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

  // Table body data
  const tableBody = data.rows.map((row) => {
    const dateFormatted = format(new Date(row.date), 'EEE d.MMM', { locale: de });
    return [
      dateFormatted,
      formatCurrency(row.kellnerUmsatz),
      '-' + formatCurrency(row.kreditkarten),
      '-' + formatCurrency(row.ordersmart),
      '-' + formatCurrency(row.wolt),
      '-' + formatCurrency(row.gutscheineEL),
      '-' + formatCurrency(row.finedine),
      '+' + formatCurrency(row.gutscheineVK),
      '-' + formatCurrency(row.einladung),
      '-' + formatCurrency(row.offeneRE),
      '-' + formatCurrency(row.vorschuss),
      '-' + formatCurrency(row.ausgaben),
      formatCurrency(row.bargeld),
    ];
  });

  // Add totals row
  tableBody.push([
    'GESAMT',
    formatCurrency(totals.kellnerUmsatz),
    '-' + formatCurrency(totals.kreditkarten),
    '-' + formatCurrency(totals.ordersmart),
    '-' + formatCurrency(totals.wolt),
    '-' + formatCurrency(totals.gutscheineEL),
    '-' + formatCurrency(totals.finedine),
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
      'OrderSmart',
      'Wolt',
      'Gutsch. EL',
      'FineDine',
      'Gutsch. VK',
      'Einladung',
      'Offene RE',
      'Vorschuss',
      'Ausgaben',
      'Bargeld',
    ]],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right', textColor: [185, 28, 28] },
      3: { halign: 'right', textColor: [185, 28, 28] },
      4: { halign: 'right', textColor: [185, 28, 28] },
      5: { halign: 'right', textColor: [185, 28, 28] },
      6: { halign: 'right', textColor: [185, 28, 28] },
      7: { halign: 'right', textColor: [22, 101, 52] },
      8: { halign: 'right', textColor: [185, 28, 28] },
      9: { halign: 'right', textColor: [185, 28, 28] },
      10: { halign: 'right', textColor: [185, 28, 28] },
      11: { halign: 'right', textColor: [185, 28, 28] },
      12: { halign: 'right' },
    },
    didParseCell: function(cellHookData) {
      // Style the totals row
      if (cellHookData.section === 'body' && cellHookData.row.index === tableBody.length - 1) {
        cellHookData.cell.styles.fontStyle = 'bold';
        cellHookData.cell.styles.fillColor = [241, 245, 249];
      }
      // Color the Bargeld column based on value
      if (cellHookData.section === 'body' && cellHookData.column.index === 12) {
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
