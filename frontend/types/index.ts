export type TransactionType = 'INCOME' | 'EXPENSE';

export type TransactionSource =
  | 'MANUAL'
  | 'GPAY_NOTIFICATION'
  | 'BANK_SMS'
  | 'GMAIL_RECEIPT'
  | 'CSV_IMPORT';

export type SyncStatus = 'PROCESSED' | 'PENDING_REVIEW' | 'REJECTED';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  userId: string | null;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  amount: string;
  type: TransactionType;
  description: string | null;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  source?: TransactionSource;
  externalId?: string | null;
  merchantName?: string | null;
  syncStatus?: SyncStatus;
  category?: Category;
}

export interface IntegrationToken {
  id: string;
  name: string;
  tokenPrefix: string;
  rawToken?: string;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CategoryRule {
  id: string;
  userId: string | null;
  categoryId: string;
  keyword: string;
  priority: number;
  createdAt: string;
  category?: Category;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: string;
  month: number;
  year: number;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  spent?: string;
  remaining?: string;
  utilizationPct?: number;
  isOverBudget?: boolean;
  isWarning?: boolean;
}

export interface DashboardSummary {
  totalIncome: string;
  totalExpenses: string;
  balance: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  monthlySavings: string;
  recentTransactions: Transaction[];
}

export interface MonthlyTrendItem {
  month: string;
  income: string;
  expenses: string;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  total: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  meta?: PaginationMeta;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: TransactionType;
  categoryId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
