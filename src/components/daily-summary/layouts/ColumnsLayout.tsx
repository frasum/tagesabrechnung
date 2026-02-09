import { ReactNode } from 'react';

interface ColumnsLayoutProps {
  statCards: ReactNode;
  warnings: ReactNode;
  notes: ReactNode;
  posTerminal: ReactNode;
  revenueCard: ReactNode;
  deductionsCard: ReactNode;
  takeaway: ReactNode;
  vouchers: ReactNode;
  tipsCard: ReactNode;
  waiterStatus: ReactNode;
  other: ReactNode;
  expenses: ReactNode;
  advances: ReactNode;
  cashBalanceCard: ReactNode;
}

export function ColumnsLayout({
  statCards,
  warnings,
  notes,
  posTerminal,
  revenueCard,
  deductionsCard,
  takeaway,
  vouchers,
  tipsCard,
  waiterStatus,
  other,
  expenses,
  advances,
  cashBalanceCard,
}: ColumnsLayoutProps) {
  return (
    <div className="space-y-6">
      {warnings}
      {statCards}

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN - Input */}
        <div className="space-y-6">
          {notes}
          {posTerminal}
          {takeaway}
          {vouchers}
          {other}
          {expenses}
          {advances}
        </div>

        {/* RIGHT COLUMN - Summary & Status */}
        <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
          {cashBalanceCard}
          {revenueCard}
          {deductionsCard}
          {tipsCard}
          {waiterStatus}
        </div>
      </div>
    </div>
  );
}
