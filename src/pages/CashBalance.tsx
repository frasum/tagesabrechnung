import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, FileDown, Download, X, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { useLabels } from '@/hooks/useLabels';
import { useCashBalanceData } from '@/hooks/useCashBalanceData';
import { useBankDeposits } from '@/hooks/useBankDeposits';
import { usePettyCash } from '@/hooks/useSettings';
import { useRestaurant } from '@/hooks/useRestaurant';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { generateCashBalancePDF } from '@/utils/pdfExport';
import { generateCashBalanceExcel } from '@/utils/excelExport';
import { PdfPreview } from '@/components/shared/PdfPreview';
import { CashBalanceSummary } from '@/components/cash-balance/CashBalanceSummary';
import { BankDepositDialog } from '@/components/cash-balance/BankDepositDialog';
import { BankDepositList } from '@/components/cash-balance/BankDepositList';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

const formatDate = (dateStr: string) => {
  const date = parseISO(dateStr);
  return format(date, 'EEE d.MMM', { locale: de });
};

export default function CashBalance() {
  const { restaurantId, restaurantName } = useRestaurant();
  const { data, isLoading, error } = useCashBalanceData(restaurantId);
  const { deposits, totalDeposits, latestDeposit, createDeposit, deleteDeposit, isCreating, isDeleting } = useBankDeposits(restaurantId);
  const { pettyCash, updatePettyCash } = usePettyCash(restaurantId);
  const { getLabel, isFieldHidden, hiddenFields } = useLabels(restaurantId);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ blobUrl: string; fileName: string } | null>(null);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);

  // Simple sum of daily cash values (matches GESAMT row in table)
  const cumulativeCash = useMemo(() => {
    if (!data || !selectedMonth) return 0;
    return data
      .filter((row) => row.date.startsWith(selectedMonth))
      .reduce((sum, row) => sum + (row.rawBargeld ?? row.bargeld), 0);
  }, [data, selectedMonth]);

  // Calculate cumulative deposits up to selected month
  const cumulativeDeposits = useMemo(() => {
    if (!deposits || !selectedMonth) return 0;
    return deposits
      .filter((d) => d.deposit_date.startsWith(selectedMonth))
      .reduce((sum, d) => sum + d.amount, 0);
  }, [deposits, selectedMonth]);

  // Carry-over from prior months: use authoritative DB function (covers full history, transfers & deposits)
  const { data: previousMonthCarryOver = 0 } = useQuery({
    queryKey: ['cash-carry-over', restaurantId, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('compute_carry_over', {
        p_restaurant_id: restaurantId!,
        p_before_date: `${selectedMonth}-01`,
      });
      if (error) throw error;
      return Number(data) || 0;
    },
    enabled: !!restaurantId && !!selectedMonth,
  });

  // Get month label for display
  const selectedMonthLabel = useMemo(() => {
    if (!selectedMonth) return '';
    const date = parseISO(`${selectedMonth}-01`);
    return format(date, 'MMMM yyyy', { locale: de });
  }, [selectedMonth]);

  // Extract available months from data
  const availableMonths = useMemo(() => {
    if (!data) return [];
    const months = new Set<string>();
    data.forEach((row) => {
      const date = parseISO(row.date);
      months.add(format(date, 'yyyy-MM'));
    });
    return Array.from(months).sort().reverse();
  }, [data]);

  // Auto-select current/latest month when data loads
  useMemo(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // Filter data by selected month
  const filteredData = useMemo(() => {
    if (!data || !selectedMonth) return data;
    return data.filter((row) => row.date.startsWith(selectedMonth));
  }, [data, selectedMonth]);

  // Handle PDF preview
  const handlePreview = useCallback(() => {
    if (!filteredData || filteredData.length === 0 || !selectedMonth) return;
    const [year, month] = selectedMonth.split('-').map(Number);
    const result = generateCashBalancePDF({
      rows: filteredData,
      deposits: deposits,
      pettyCash: pettyCash,
      month: month - 1,
      year,
      labels: { ordersmart_revenue: getLabel('ordersmart_revenue'), wolt_revenue: getLabel('wolt_revenue'), finedine_vouchers: getLabel('finedine_vouchers'), einladung: getLabel('einladung') },
      hiddenFields,
    }, { preview: true });
    
    if (result) {
      setPdfPreview(result);
      setPreviewOpen(true);
    }
  }, [filteredData, selectedMonth, deposits, pettyCash, restaurantName]);

  // Handle download from preview
  const handleDownload = useCallback(() => {
    if (pdfPreview) {
      const link = document.createElement('a');
      link.href = pdfPreview.blobUrl;
      link.download = pdfPreview.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [pdfPreview]);

  // Cleanup blob URL when dialog closes
  const handleClosePreview = useCallback(() => {
    if (pdfPreview?.blobUrl) {
      URL.revokeObjectURL(pdfPreview.blobUrl);
    }
    setPdfPreview(null);
    setPreviewOpen(false);
  }, [pdfPreview]);

  // Handle Excel export
  const handleExcelExport = useCallback(() => {
    if (!filteredData || filteredData.length === 0 || !selectedMonth) return;
    const [year, month] = selectedMonth.split('-').map(Number);
    generateCashBalanceExcel({
      rows: filteredData,
      deposits: deposits,
      month: month - 1,
      year,
      restaurantName,
      labels: { ordersmart_revenue: getLabel('ordersmart_revenue'), wolt_revenue: getLabel('wolt_revenue'), finedine_vouchers: getLabel('finedine_vouchers'), einladung: getLabel('einladung') },
      hiddenFields,
    });
  }, [filteredData, selectedMonth, deposits, restaurantName, getLabel]);

  // Handle deposit submission
  const handleDepositSubmit = useCallback((data: { deposit_date: string; amount: number; notes?: string }) => {
    if (!restaurantId) return;
    createDeposit({ ...data, restaurant_id: restaurantId }, {
      onSuccess: () => setDepositDialogOpen(false),
    });
  }, [createDeposit, restaurantId]);

  // Handle deposit delete
  const handleDeleteDeposit = useCallback((id: string) => {
    if (!restaurantId) return;
    deleteDeposit({ id, restaurantId });
  }, [deleteDeposit, restaurantId]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Wallet className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Bargeldbestand</h1>
        </div>

        {/* Cash Balance Summary with Bank Deposits */}
        <CashBalanceSummary
          totalCash={cumulativeCash}
          totalDeposits={cumulativeDeposits}
          pettyCash={pettyCash}
          wechselgeldbestand={pettyCash + cumulativeCash + previousMonthCarryOver}
          carryOverFromPreviousMonth={previousMonthCarryOver}
          latestDeposit={latestDeposit}
          monthLabel={selectedMonthLabel}
          onAddDeposit={() => setDepositDialogOpen(true)}
        />

        {/* Bank Deposits List */}
        <BankDepositList
          deposits={deposits}
          onDelete={handleDeleteDeposit}
          isDeleting={isDeleting}
        />

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Monat:</span>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Monat wählen" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((month) => {
                  const date = parseISO(`${month}-01`);
                  return (
                    <SelectItem key={month} value={month}>
                      {format(date, 'MMMM yyyy', { locale: de })}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={!filteredData || filteredData.length === 0}
                variant="outline"
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handlePreview} className="gap-2 cursor-pointer">
                <FileDown className="h-4 w-4" />
                PDF Export
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExcelExport} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4" />
                Excel Export
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tägliche Bargeldübersicht</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[100px]">Datum</TableHead>
                    <TableHead className="text-right min-w-[100px]" title="Brutto-Kassenumsatz aus dem Z-Bon der Session (sessions.pos_total)">Kassenumsatz (Brutto)</TableHead>
                    <TableHead className="text-right min-w-[100px]">Kreditkarten</TableHead>
                    <TableHead className="text-right min-w-[100px]">{getLabel('ordersmart_revenue')}</TableHead>
                    <TableHead className="text-right min-w-[90px]">{getLabel('wolt_revenue')}</TableHead>
                    <TableHead className="text-right min-w-[100px]">Gutsch. EL</TableHead>
                    {!isFieldHidden('finedine_vouchers') && <TableHead className="text-right min-w-[90px]">{getLabel('finedine_vouchers')}</TableHead>}
                    <TableHead className="text-right min-w-[100px]">Gutsch. VK</TableHead>
                    <TableHead className="text-right min-w-[90px]">{getLabel('einladung')}</TableHead>
                    <TableHead className="text-right min-w-[90px]">Offene RE</TableHead>
                    <TableHead className="text-right min-w-[90px]">Vorschuss</TableHead>
                    <TableHead className="text-right min-w-[90px]">Ausgaben</TableHead>
                    <TableHead className="text-right min-w-[110px] font-bold">Bargeld</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: isFieldHidden('finedine_vouchers') ? 12 : 13 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={isFieldHidden('finedine_vouchers') ? 12 : 13} className="text-center text-destructive">
                        Fehler beim Laden der Daten
                      </TableCell>
                    </TableRow>
                  ) : filteredData && filteredData.length > 0 ? (
                    filteredData.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium">
                          {formatDate(row.date)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-success">{formatCurrency(row.kellnerUmsatz)}</TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {formatCurrency(row.kreditkarten)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {formatCurrency(row.ordersmart)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {formatCurrency(row.wolt)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {formatCurrency(row.gutscheineEL)}
                        </TableCell>
                        {!isFieldHidden('finedine_vouchers') && (
                          <TableCell className="text-right tabular-nums text-destructive">
                            {formatCurrency(row.finedine)}
                          </TableCell>
                        )}
                        <TableCell className="text-right tabular-nums text-success">
                          {formatCurrency(row.gutscheineVK)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {formatCurrency(row.einladung)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {formatCurrency(row.offeneRE)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {formatCurrency(row.vorschuss)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {formatCurrency(row.ausgaben)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right tabular-nums font-bold',
                            row.rawBargeld >= 0 ? 'text-success' : 'text-destructive'
                          )}
                        >
                          {formatCurrency(row.rawBargeld)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center text-muted-foreground">
                        Keine Daten vorhanden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {filteredData && filteredData.length > 0 && !isLoading && (
                  <TableFooter>
                    <TableRow className="bg-muted/50">
                      <TableCell className="sticky left-0 bg-muted/50 z-10 font-bold">
                        GESAMT
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-success">
                        {formatCurrency(filteredData.reduce((sum, row) => sum + row.kellnerUmsatz, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        {formatCurrency(filteredData.reduce((sum, row) => sum + row.kreditkarten, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        {formatCurrency(filteredData.reduce((sum, row) => sum + row.ordersmart, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        {formatCurrency(filteredData.reduce((sum, row) => sum + row.wolt, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        {formatCurrency(filteredData.reduce((sum, row) => sum + row.gutscheineEL, 0))}
                      </TableCell>
                      {!isFieldHidden('finedine_vouchers') && (
                        <TableCell className="text-right tabular-nums font-bold text-destructive">
                          {formatCurrency(filteredData.reduce((sum, row) => sum + row.finedine, 0))}
                        </TableCell>
                      )}
                      <TableCell className="text-right tabular-nums font-bold text-success">
                        {formatCurrency(filteredData.reduce((sum, row) => sum + row.gutscheineVK, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        {formatCurrency(filteredData.reduce((sum, row) => sum + row.einladung, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        {formatCurrency(filteredData.reduce((sum, row) => sum + row.offeneRE, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        {formatCurrency(filteredData.reduce((sum, row) => sum + row.vorschuss, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-destructive">
                        {formatCurrency(filteredData.reduce((sum, row) => sum + row.ausgaben, 0))}
                      </TableCell>
                      {(() => {
                        const totalBargeld = filteredData.reduce((sum, row) => sum + row.rawBargeld, 0);
                        return (
                          <TableCell className={cn(
                            'text-right tabular-nums font-bold',
                            totalBargeld >= 0 ? 'text-success' : 'text-destructive'
                          )}>
                            {formatCurrency(totalBargeld)}
                          </TableCell>
                        );
                      })()}
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PDF Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={(open) => !open && handleClosePreview()}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5" />
              PDF Vorschau - {pdfPreview?.fileName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 p-4 min-h-0">
            {pdfPreview && <PdfPreview blobUrl={pdfPreview.blobUrl} fileName={pdfPreview.fileName} className="h-full" />}
          </div>
          <DialogFooter className="px-6 py-4 border-t gap-2">
            <Button variant="outline" onClick={handleClosePreview} className="gap-2">
              <X className="h-4 w-4" />
              Schließen
            </Button>
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Herunterladen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Deposit Dialog */}
      <BankDepositDialog
        open={depositDialogOpen}
        onOpenChange={setDepositDialogOpen}
        onSubmit={handleDepositSubmit}
        isSubmitting={isCreating}
      />
    </AppLayout>
  );
}
