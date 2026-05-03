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
  labels?: Record<string, string>;
  hiddenFields?: string[];
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

const n = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export function generateCashBalanceExcel({ rows, deposits, month, year, restaurantName, labels, hiddenFields }: ExcelExportParams): void {
  const l = (key: string, fallback: string) => labels?.[key] ?? fallback;
  const isHidden = (key: string) => hiddenFields?.includes(key) ?? false;
  const showFinedine = !isHidden('finedine_vouchers');
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
  ]);

  // Data rows
  rows.forEach((row) => {
    wsData.push([
      formatDateShort(row.date),
      n(row.kellnerUmsatz),
      n(row.kreditkarten),
      n(row.ordersmart),
      n(row.wolt),
      n(row.gutscheineEL),
      ...(showFinedine ? [n(row.finedine)] : []),
      n(row.gutscheineVK),
      n(row.einladung),
      n(row.offeneRE),
      n(row.vorschuss),
      n(row.ausgaben),
      n(row.rawBargeld),
    ]);
  });

  // Totals row
  const totals = rows.reduce(
    (acc, row) => ({
      kellnerUmsatz: acc.kellnerUmsatz + n(row.kellnerUmsatz),
      kreditkarten: acc.kreditkarten + n(row.kreditkarten),
      ordersmart: acc.ordersmart + n(row.ordersmart),
      wolt: acc.wolt + n(row.wolt),
      gutscheineEL: acc.gutscheineEL + n(row.gutscheineEL),
      finedine: acc.finedine + n(row.finedine),
      gutscheineVK: acc.gutscheineVK + n(row.gutscheineVK),
      einladung: acc.einladung + n(row.einladung),
      offeneRE: acc.offeneRE + n(row.offeneRE),
      vorschuss: acc.vorschuss + n(row.vorschuss),
      ausgaben: acc.ausgaben + n(row.ausgaben),
      bargeld: acc.bargeld + n(row.rawBargeld),
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
    totals.kreditkarten,
    totals.ordersmart,
    totals.wolt,
    totals.gutscheineEL,
    ...(showFinedine ? [totals.finedine] : []),
    totals.gutscheineVK,
    totals.einladung,
    totals.offeneRE,
    totals.vorschuss,
    totals.ausgaben,
    totals.bargeld,
  ]);

  // Empty rows before bank deposits
  wsData.push([]);
  wsData.push([]);

  // Bank Deposits Section
  wsData.push(['BANKEINZAHLUNGEN']);
  wsData.push(['Datum', 'Betrag']);

  filteredDeposits.forEach((deposit) => {
    wsData.push([formatDateFull(deposit.deposit_date), n(deposit.amount)]);
  });

  // Deposits total
  const depositsTotal = filteredDeposits.reduce((sum, d) => sum + n(d.amount), 0);
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
    ...(showFinedine ? [{ wch: 10 }] : []), // FineDine
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
  const safeRestaurant = restaurantName ? `_${restaurantName}` : '';
  const fileName = `Bargeldbestand_${format(monthDate, 'yyyy-MM', { locale: de })}${safeRestaurant}.xlsx`;

  // Reliable browser-safe download via Blob (works in sandboxed iframes & PWAs)
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getCashBalanceExcelFileName(month: number, year: number, restaurantName?: string): string {
  const monthDate = new Date(year, month);
  const safeRestaurant = restaurantName ? `_${restaurantName}` : '';
  return `Bargeldbestand_${format(monthDate, 'yyyy-MM', { locale: de })}${safeRestaurant}.xlsx`;
}
