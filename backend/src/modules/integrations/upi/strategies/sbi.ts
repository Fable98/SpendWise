import { ParserStrategy, ParsedTxn } from '../types';

/**
 * Parses State Bank of India (SBI) SMS:
 * e.g. "Dear SBI User, A/c [REDACTED] debited by Rs.450.00 on 20Nov26 transfer to Starbucks Ref No 432589012345"
 * e.g. "Dear SBI User, A/c [REDACTED] credited by Rs.1500.00 on 20Nov26 by transfer from Rahul Ref No 432589099887"
 */
export const sbiSmsParser: ParserStrategy = {
  name: 'sbi-sms',

  matches(pkg: string, text: string): boolean {
    const p = (pkg || '').toLowerCase();
    const t = (text || '').toLowerCase();
    return p.includes('sbi') || t.includes('sbi user') || t.includes('state bank') || t.includes('sbiinb');
  },

  parse(text: string, timestamp?: number): ParsedTxn | null {
    const clean = text.replace(/\s+/g, ' ').trim();

    const utrMatch = clean.match(/(?:Ref\s*(?:No)?|UTR|UPI\s*Ref)\s*[:\s]*([0-9]{12})/i);
    const utr = utrMatch ? utrMatch[1] : undefined;

    // 1. Debit
    const debitMatch = clean.match(
      /(?:debited\s*(?:by|for)?)\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:on\s+[\w-]+\s+)?(?:transfer\s+to|to)\s*([^.]+?)(?:\s+Ref|\s+UPI|\.|$)/i
    );

    if (debitMatch) {
      const amount = parseFloat(debitMatch[1].replace(/,/g, ''));
      let merchant = debitMatch[2]?.trim();
      merchant = merchant.replace(/\s+(?:Ref|UPI|by|transfer).*$/i, '').trim();

      if (!isNaN(amount) && amount > 0) {
        return {
          amount,
          type: 'EXPENSE',
          merchant: merchant || undefined,
          utr,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          confidence: utr && merchant ? 0.95 : 0.85,
          strategy: 'sbi-sms',
        };
      }
    }

    // 2. Credit
    const creditMatch = clean.match(
      /(?:credited\s*(?:by|with)?)\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:on\s+[\w-]+\s+)?(?:by\s+transfer\s+from|from)\s*([^.]+?)(?:\s+Ref|\s+UPI|\.|$)/i
    );

    if (creditMatch) {
      const amount = parseFloat(creditMatch[1].replace(/,/g, ''));
      let merchant = creditMatch[2]?.trim();
      merchant = merchant.replace(/\s+(?:Ref|UPI|by|transfer).*$/i, '').trim();

      if (!isNaN(amount) && amount > 0) {
        return {
          amount,
          type: 'INCOME',
          merchant: merchant || undefined,
          utr,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          confidence: utr && merchant ? 0.95 : 0.85,
          strategy: 'sbi-sms',
        };
      }
    }

    return null;
  },
};
