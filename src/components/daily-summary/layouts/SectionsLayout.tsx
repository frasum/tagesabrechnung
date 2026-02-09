import { ReactNode } from 'react';

interface SectionsLayoutProps {
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

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export function SectionsLayout({
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
}: SectionsLayoutProps) {
  return (
    <div className="space-y-8">
      {warnings}
      {statCards}

      {/* EINGABEN Section */}
      <section className="rounded-xl bg-muted/30 p-6 border border-border/50">
        <SectionHeader title="Eingaben" />
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="xl:col-span-2">{posTerminal}</div>
          {takeaway}
          {vouchers}
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {other}
          {notes}
        </div>
      </section>

      {/* ÜBERSICHT Section */}
      <section className="rounded-xl bg-primary/5 p-6 border border-primary/10">
        <SectionHeader title="Übersicht" />
        <div className="grid md:grid-cols-3 gap-4">
          {revenueCard}
          {deductionsCard}
          {tipsCard}
        </div>
      </section>

      {/* STATUS Section */}
      <section className="rounded-xl bg-muted/30 p-6 border border-border/50">
        <SectionHeader title="Status" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {waiterStatus}
          {cashBalanceCard}
          {expenses}
          {advances}
        </div>
      </section>
    </div>
  );
}
