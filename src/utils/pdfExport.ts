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
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Tagesabrechnung', margin, yPos);
  
  yPos += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const dateStr = format(new Date(data.session.session_date), "EEEE, d. MMMM yyyy", { locale: de });
  doc.text(dateStr, margin, yPos);
  
  yPos += 4;
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(`Erstellt am: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })}`, margin, yPos);
  doc.setTextColor(0);

  // Alert for mismatches
  yPos += 10;
  if (data.totals.posMismatch !== 0 || data.totals.cardTerminalMismatch !== 0) {
    doc.setFillColor(254, 226, 226);
    doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 16, 'F');
    doc.setFontSize(10);
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('ACHTUNG: Differenzen festgestellt!', margin + 4, yPos + 2);
    doc.setFont('helvetica', 'normal');
    if (data.totals.posMismatch !== 0) {
      doc.text(`POS Differenz: ${formatCurrency(data.totals.posMismatch)}`, margin + 4, yPos + 8);
    }
    if (data.totals.cardTerminalMismatch !== 0) {
      doc.text(`Terminal Differenz: ${formatCurrency(data.totals.cardTerminalMismatch)}`, pageWidth / 2, yPos + 8);
    }
    doc.setTextColor(0);
    yPos += 16;
  }

  // BARGELD Result Box
  yPos += 6;
  const bargeldColor = data.totals.bargeld >= 0 ? [220, 252, 231] : [254, 226, 226];
  const bargeldTextColor = data.totals.bargeld >= 0 ? [22, 101, 52] : [185, 28, 28];
  doc.setFillColor(bargeldColor[0], bargeldColor[1], bargeldColor[2]);
  doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 18, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(bargeldTextColor[0], bargeldTextColor[1], bargeldTextColor[2]);
  doc.text('BARGELD', margin + 4, yPos + 4);
  doc.text(formatCurrency(data.totals.bargeld), pageWidth - margin - 4, yPos + 4, { align: 'right' });
  doc.setTextColor(0);
  yPos += 22;

  // Main Stats
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Übersicht', margin, yPos);
  yPos += 6;

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['Kennzahl', 'Betrag']],
    body: [
      ['Kellner Umsatz', formatCurrency(data.totals.kellnerUmsatz)],
      ['Kartenzahlungen', formatCurrency(data.totals.totalCardTotal)],
       ['Take Away', formatCurrency(data.totals.totalDeliveryRevenue)],
      ['Hilf Mahl', formatCurrency(data.totals.totalHilfMahl)],
      ['Ausgaben', formatCurrency(data.totals.totalExpenses)],
      ['Offene Rechnungen', formatCurrency(data.totals.totalOpenInvoices)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Waiter Shifts Table
  if (data.waiterShifts.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Kellner Schichten', margin, yPos);
    yPos += 6;

    autoTable(doc, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [['Name', 'POS', 'Kassiert', 'Karten', 'HilfM', 'Erwartet', 'Abgeg.', 'Abw.', 'K.TG', 'W.TG']],
      body: data.waiterShifts.map(shift => {
        const expected = (shift.kassiert_brutto || 0) + shift.hilf_mahl - shift.open_invoices - shift.card_total;
        const abweichung = shift.cash_handed_in - expected;
        const waiterTip = shift.cash_handed_in - expected - shift.kitchen_tip;
        return [
          shift.waiter_name,
          formatCurrency(shift.pos_sales),
          formatCurrency(shift.kassiert_brutto || 0),
          formatCurrency(shift.card_total),
          formatCurrency(shift.hilf_mahl),
          formatCurrency(expected),
          formatCurrency(shift.cash_handed_in),
          formatCurrency(abweichung),
          formatCurrency(shift.kitchen_tip),
          formatCurrency(waiterTip),
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right' },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Check if we need a new page
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  // Revenue Breakdown
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Einnahmen Übersicht', margin, yPos);
  yPos += 6;

  const revenueData = [
    ['Kellner Umsatz', formatCurrency(data.totals.kellnerUmsatz)],
    ['Gutschein Verkauf', formatCurrency(data.session.vouchers_sold || 0)],
    ['Sonstige Einnahmen', formatCurrency(data.session.sonstige_einnahme || 0)],
    ['Hilf Mahl', formatCurrency(data.totals.totalHilfMahl)],
  ];
  const totalRevenue = data.totals.kellnerUmsatz + (data.session.vouchers_sold || 0) + (data.session.sonstige_einnahme || 0) + data.totals.totalHilfMahl;
  revenueData.push(['Summe Einnahmen', formatCurrency(totalRevenue)]);

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['Position', 'Betrag']],
    body: revenueData,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: function(data) {
      if (data.row.index === revenueData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 252, 231];
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Deductions Breakdown
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Abzüge Übersicht', margin, yPos);
  yPos += 6;

  const deductionsData = [
    ['KK Terminal 1', formatCurrency(data.session.terminal_1_total || 0)],
    ['KK Terminal 2', formatCurrency(data.session.terminal_2_total || 0)],
    ['Gutschein Eingelöst', formatCurrency(data.session.vouchers_redeemed || 0)],
    ['FineDine Gutscheine', formatCurrency(data.session.finedine_vouchers || 0)],
    ['Vorschuss', formatCurrency(data.session.vorschuss || 0)],
    ['Einladung', formatCurrency(data.session.einladung || 0)],
    ['Offene Rechnungen', formatCurrency(data.totals.totalOpenInvoices)],
    ['Ausgaben', formatCurrency(data.totals.totalExpenses)],
    ['Take Away', formatCurrency(data.totals.totalDeliveryRevenue)],
  ];
  const totalDeductions = (data.session.terminal_1_total || 0) +
    (data.session.terminal_2_total || 0) +
    (data.session.vouchers_redeemed || 0) +
    (data.session.finedine_vouchers || 0) +
    (data.session.vorschuss || 0) +
    (data.session.einladung || 0) +
    data.totals.totalOpenInvoices +
    data.totals.totalExpenses +
    data.totals.totalDeliveryRevenue;
  deductionsData.push(['Summe Abzüge', formatCurrency(totalDeductions)]);

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['Position', 'Betrag']],
    body: deductionsData,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: function(data) {
      if (data.row.index === deductionsData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [254, 226, 226];
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Check if we need a new page for delivery platforms
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  // Delivery Platforms
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Take Away', margin, yPos);
  yPos += 6;

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['Plattform', 'Umsatz']],
    body: [
      ['Takeaway GL', formatCurrency(data.session.takeaway_total || 0)],
      ['OrderSmart', formatCurrency(data.session.ordersmart_revenue || 0)],
      ['Wolt', formatCurrency(data.session.wolt_revenue || 0)],
      ['Gesamt', formatCurrency(data.totals.totalDeliveryRevenue)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: function(data) {
      if (data.row.index === 3) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Tips
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Trinkgeld Übersicht', margin, yPos);
  yPos += 6;

  const waiterCount = data.waiterShifts.length;
  const tipPerWaiter = waiterCount > 0 ? data.totals.totalWaiterTip / waiterCount : 0;

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['Kategorie', 'Betrag']],
    body: [
      ['Küchen Trinkgeld (2%)', formatCurrency(data.totals.totalKitchenTip)],
      ['Kellner Trinkgeld Pool', formatCurrency(data.totals.totalWaiterTip)],
      [`→ Pro Kellner (${waiterCount})`, formatCurrency(tipPerWaiter)],
      ['Gesamt Trinkgeld', formatCurrency(data.totals.totalKitchenTip + data.totals.totalWaiterTip)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: function(data) {
      if (data.row.index === 2) {
        data.cell.styles.textColor = [100, 100, 100];
        data.cell.styles.fontSize = 8;
      }
      if (data.row.index === 3) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 252, 231];
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Kitchen staff tip distribution
  if (data.kitchenShifts.length > 0) {
    const totalHours = data.kitchenShifts.reduce((sum, s) => sum + s.hours_worked, 0);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Küchenpersonal Trinkgeld-Verteilung', margin, yPos);
    yPos += 6;

    autoTable(doc, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [['Name', 'Stunden', 'Anteil', 'Trinkgeld']],
      body: data.kitchenShifts.map(shift => {
        const tipAmount = totalHours > 0 ? (shift.hours_worked / totalHours) * data.totals.totalKitchenTip : 0;
        const percentage = totalHours > 0 ? ((shift.hours_worked / totalHours) * 100).toFixed(1) : '0';
        return [
          shift.staff_name,
          shift.hours_worked.toFixed(2) + ' h',
          percentage + '%',
          formatCurrency(tipAmount),
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    });
  }

  // Expenses
  if (data.expenses.length > 0) {
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Ausgaben', margin, yPos);
    yPos += 6;

    autoTable(doc, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [['Beschreibung', 'Betrag']],
      body: [
        ...data.expenses.map(e => [e.description, formatCurrency(e.amount)]),
        ['Gesamt', formatCurrency(data.totals.totalExpenses)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' } },
      didParseCell: function(data) {
        if (data.row.index === data.table.body.length - 1) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
  }

  // BARGELD Formula Explanation
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  if (yPos > 180) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Wie wird BARGELD berechnet?', margin, yPos);
  yPos += 8;

  // Formula breakdown table
  const formulaData = [
    ['+ Kellner Umsatz', formatCurrency(data.totals.kellnerUmsatz)],
    ['+ Gutschein Verkauf', formatCurrency(data.session.vouchers_sold || 0)],
    ['+ Sonstige Einnahmen', formatCurrency(data.session.sonstige_einnahme || 0)],
    ['+ Hilf Mahl', formatCurrency(data.totals.totalHilfMahl)],
    ['= Summe Einnahmen', formatCurrency(totalRevenue)],
    ['', ''],
    ['− Terminals (1+2)', formatCurrency((data.session.terminal_1_total || 0) + (data.session.terminal_2_total || 0))],
    ['− Gutschein Eingelöst + FineDine', formatCurrency((data.session.vouchers_redeemed || 0) + (data.session.finedine_vouchers || 0))],
    ['− Vorschuss + Einladung', formatCurrency((data.session.vorschuss || 0) + (data.session.einladung || 0))],
    ['− Offene Rechnungen', formatCurrency(data.totals.totalOpenInvoices)],
    ['− Ausgaben', formatCurrency(data.totals.totalExpenses)],
    ['− Take Away', formatCurrency(data.totals.totalDeliveryRevenue)],
    ['= Summe Abzüge', formatCurrency(totalDeductions)],
    ['', ''],
    ['= BARGELD', formatCurrency(data.totals.bargeld)],
  ];

  const bargeldIsPositive = data.totals.bargeld >= 0;

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['Formel-Position', 'Betrag']],
    body: formulaData,
    theme: 'plain',
    headStyles: { fillColor: [51, 65, 85], fontSize: 9, textColor: 255 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: function(cellHookData) {
      // Style additions (green)
      if (cellHookData.section === 'body' && cellHookData.row.index >= 0 && cellHookData.row.index <= 3) {
        cellHookData.cell.styles.textColor = [22, 101, 52];
      }
      // Style "Summe Einnahmen" row
      if (cellHookData.section === 'body' && cellHookData.row.index === 4) {
        cellHookData.cell.styles.fontStyle = 'bold';
        cellHookData.cell.styles.fillColor = [220, 252, 231];
        cellHookData.cell.styles.textColor = [22, 101, 52];
      }
      // Style deductions (red)
      if (cellHookData.section === 'body' && cellHookData.row.index >= 6 && cellHookData.row.index <= 12) {
        cellHookData.cell.styles.textColor = [185, 28, 28];
      }
      // Style "Summe Abzüge" row
      if (cellHookData.section === 'body' && cellHookData.row.index === 13) {
        cellHookData.cell.styles.fontStyle = 'bold';
        cellHookData.cell.styles.fillColor = [254, 226, 226];
        cellHookData.cell.styles.textColor = [185, 28, 28];
      }
      // Empty row - hide
      if (cellHookData.section === 'body' && (cellHookData.row.index === 5 || cellHookData.row.index === 14)) {
        cellHookData.cell.styles.minCellHeight = 2;
        cellHookData.cell.styles.cellPadding = 0;
      }
      // Final BARGELD row
      if (cellHookData.section === 'body' && cellHookData.row.index === 15) {
        cellHookData.cell.styles.fontStyle = 'bold';
        cellHookData.cell.styles.fontSize = 11;
        if (bargeldIsPositive) {
          cellHookData.cell.styles.fillColor = [220, 252, 231];
          cellHookData.cell.styles.textColor = [22, 101, 52];
        } else {
          cellHookData.cell.styles.fillColor = [254, 226, 226];
          cellHookData.cell.styles.textColor = [185, 28, 28];
        }
      }
    },
  });

  // Footer
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

  // Save
  const fileName = `Tagesabrechnung_${format(new Date(data.session.session_date), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};
