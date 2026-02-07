// Types for the restaurant cash reconciliation app

export interface Session {
  id: string;
  session_date: string;
  spicery_counter: number;
  pos_total: number;
  terminal_1_total: number;
  terminal_2_total: number;
  ordersmart_revenue: number;
  wolt_revenue: number;
  vouchers_sold: number;
  vouchers_redeemed: number;
  finedine_vouchers: number;
  vorschuss: number;
  einladung: number;
  sonstige_einnahme: number;
  notes: string | null;
  is_finalized: boolean;
  created_at: string;
  updated_at: string;
  // New fields from Excel
  takeaway_total: number;
  spicery_transactions: number;
  card_total_gl: number;
}

export interface WaiterShift {
  id: string;
  session_id: string;
  waiter_name: string;
  second_waiter_name: string | null;
  pos_sales: number;
  kassiert_brutto: number;
  card_total: number;
  hilf_mahl: number;
  open_invoices: number;
  cash_handed_in: number;
  differenz: number;
  kitchen_tip: number;
  created_at: string;
  submitted_at: string | null;
  participates_in_pool: boolean;
}

export interface CardTransaction {
  id: string;
  waiter_shift_id: string;
  card_type: 'EC' | 'Visa' | 'Amex' | 'Maestro';
  amount: number;
  created_at: string;
}

export interface KitchenShift {
  id: string;
  session_id: string;
  staff_name: string;
  shift_start: string;
  shift_end: string;
  hours_worked: number;
  created_at: string;
}

export interface Expense {
  id: string;
  session_id: string;
  description: string;
  amount: number;
  created_at: string;
}

// Calculated summary types
export interface DailySummary {
  kellnerUmsatz: number;
  totalCardTransactions: number;
  totalKitchenTip: number;
  totalWaiterTip: number;
  totalDeliveryRevenue: number;
  totalExpenses: number;
  totalOpenInvoices: number;
  totalHilfMahl: number;
  bargeld: number;
  posMismatch: number;
  cardTerminalMismatch: number;
}
