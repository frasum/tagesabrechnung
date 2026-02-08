import * as XLSX from 'xlsx';
import { CashBalanceRow } from '@/hooks/useCashBalanceData';
import { BankDeposit } from '@/hooks/useBankDeposits';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface ExcelExportParams {
  rows: CashBalanceRow[];
  deposits: BankDeposit[];
  month: number;
  year: number;
  restaurantName?: string;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

const formatDateShort = (dateStr: string): string => {
  const date = parseISO(dateStr);
  return format(date, 'EEE d.M.', { locale: de });
};

const formatDateFull = (dateStr: string): string => {
  const date = parseISO(dateStr);
  return format(date, 'dd.MM.yyyy', { locale: de });
};

export function generateCashBalanceExcel({ rows, deposits, month, year, restaurantName }: ExcelExportParams): void {
  const monthDate = new Date(year, month);
  const monthName = format(monthDate, 'MMMM yyyy', { locale: de });
  const createdAt = format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de });

  // Filter deposits for the selected month
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const filteredDeposits = deposits.filter((d) => d.deposit_date.startsWith(monthStr));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const wsData: (string | number)[][] = [];

  // Title and creation date
  wsData.push([`Bargeldbestand - ${monthName}${restaurantName ? ` (${restaurantName})` : ''}`]);
  wsData.push([`Erstellt am: ${createdAt}`]);
  wsData.push([]); // Empty row

  // Daily Overview Section
  wsData.push(['TÄGLICHE ÜBERSICHT']);
  
  // Header row
  wsData.push([
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
  ]);

  // Data rows
  rows.forEach((row) => {
    wsData.push([
      formatDateShort(row.date),
      row.kellnerUmsatz,
      -row.kreditkarten,
      -row.ordersmart,
      -row.wolt,
      -row.gutscheineEL,
      -row.finedine,
      row.gutscheineVK,
      -row.einladung,
      -row.offeneRE,
      -row.vorschuss,
      -row.ausgaben,
      row.bargeld,
    ]);
  });

  // Totals row
  const totals = rows.reduce(
    (acc, row) => ({
      kellnerUmsatz: acc.kellnerUmsatz + row.kellnerUmsatz,
      kreditkarten: acc.kreditkarten + row.kreditkarten,
      ordersmart: acc.ordersmart + row.ordersmart,
      wolt: acc.wolt + row.wolt,
      gutscheineEL: acc.gutscheineEL + row.gutscheineEL,
      finedine: acc.finedine + row.finedine,
      gutscheineVK: acc.gutscheineVK + row.gutscheineVK,
      einladung: acc.einladung + row.einladung,
      offeneRE: acc.offeneRE + row.offeneRE,
      vorschuss: acc.vorschuss + row.vorschuss,
      ausgaben: acc.ausgaben + row.ausgaben,
      bargeld: acc.bargeld + row.bargeld,
    }),
    {
      kellnerUmsatz: 0,
      kreditkarten: 0,
      ordersmart: 0,
      wolt: 0,
      gutscheineEL: 0,
      finedine: 0,
      gutscheineVK: 0,
      einladung: 0,
      offeneRE: 0,
      vorschuss: 0,
      ausgaben: 0,
      bargeld: 0,
    }
  );

  wsData.push([
    'GESAMT',
    totals.kellnerUmsatz,
    -totals.kreditkarten,
    -totals.ordersmart,
    -totals.wolt,
    -totals.gutscheineEL,
    -totals.finedine,
    totals.gutscheineVK,
    -totals.einladung,
    -totals.offeneRE,
    -totals.vorschuss,
    -totals.ausgaben,
    totals.bargeld,
  ]);

  // Empty rows before bank deposits
  wsData.push([]);
  wsData.push([]);

  // Bank Deposits Section
  wsData.push(['BANKEINZAHLUNGEN']);
  wsData.push(['Datum', 'Betrag']);

  filteredDeposits.forEach((deposit) => {
    wsData.push([formatDateFull(deposit.deposit_date), deposit.amount]);
  });

  // Deposits total
  const depositsTotal = filteredDeposits.reduce((sum, d) => sum + d.amount, 0);
  wsData.push(['Gesamt', depositsTotal]);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Datum
    { wch: 14 }, // Tagesumsatz
    { wch: 14 }, // Kreditkarten
    { wch: 12 }, // OrderSmart
    { wch: 10 }, // Wolt
    { wch: 12 }, // Gutsch. EL
    { wch: 10 }, // FineDine
    { wch: 12 }, // Gutsch. VK
    { wch: 10 }, // Einladung
    { wch: 10 }, // Offene RE
    { wch: 10 }, // Vorschuss
    { wch: 10 }, // Ausgaben
    { wch: 12 }, // Bargeld
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Bargeldbestand');

  // Generate filename
  const fileName = `Bargeldbestand_${format(monthDate, 'yyyy-MM', { locale: de })}${restaurantName ? `_${restaurantName}` : ''}.xlsx`;

  // Trigger download
  XLSX.writeFile(wb, fileName);
}
