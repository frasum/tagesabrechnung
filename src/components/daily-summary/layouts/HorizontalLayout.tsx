import { ReactNode } from 'react';

interface HorizontalLayoutProps {
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

export function HorizontalLayout({
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
}: HorizontalLayoutProps) {
  return (
    <div className="space-y-6">
      {warnings}
      {statCards}
      {notes}
      {posTerminal}
      
      {/* Einnahmen & Abzüge nebeneinander */}
      <div className="grid md:grid-cols-2 gap-6">
        {revenueCard}
        {deductionsCard}
      </div>
      
      {takeaway}
      
      {/* Gutscheine & Sonstiges nebeneinander */}
      <div className="grid md:grid-cols-2 gap-6">
        {vouchers}
        {other}
      </div>
      
      {/* Trinkgeld & Kellner-Status nebeneinander */}
      <div className="grid md:grid-cols-2 gap-6">
        {tipsCard}
        {waiterStatus}
      </div>
      
      {/* Kassenstand, Ausgaben & Vorschuss */}
      <div className="grid md:grid-cols-3 gap-6">
        {cashBalanceCard}
        {expenses}
        {advances}
      </div>
    </div>
  );
}
