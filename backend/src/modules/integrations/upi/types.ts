export type ParsedTxn = {
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  merchant?: string;
  utr?: string;
  timestamp?: Date;
  confidence: number; // 0.00 to 1.00
  strategy: string;
};

export interface ParserStrategy {
  name: string;
  matches(pkg: string, text: string): boolean;
  parse(text: string, timestamp?: number): ParsedTxn | null;
}

export interface IngestionPayload {
  source?: 'GPAY_NOTIFICATION' | 'BANK_SMS' | 'MANUAL';
  packageName?: string;
  sender?: string;
  title?: string;
  body: string;
  timestamp?: number;
}
