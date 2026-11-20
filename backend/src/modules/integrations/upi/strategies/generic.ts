import { ParserStrategy, ParsedTxn } from '../types';

/**
 * Generic UPI fallback parser for notifications & SMS from any UPI app or bank.
 * Matches common payment formats:
 * - "Rs. 250 paid to Swiggy via UPI"
 * - "Debited INR 500.00 for payment to Uber UPI Ref: 123456789012"
 * - "Credited INR 1,000 from Alex"
 */
export const genericUpiParser: ParserStrategy = {
  name: 'generic-upi',

  matches(_pkg: string, text: string): boolean {
    const t = (text || '').toLowerCase();
    return (
      t.includes('upi') ||
      t.includes('paid') ||
      t.includes('debited') ||
      t.includes('credited') ||
      t.includes('transferred') ||
      t.includes('sent') ||
      t.includes('received')
    );
  },

  parse(text: string, timestamp?: number): ParsedTxn | null {
    const clean = text.replace(/\s+/g, ' ').trim();

    // Look for 12-digit UTR
    const utrMatch = clean.match(/(?:UPI\s*Ref(?:\s*no)?|Ref(?:\s*no)?|UTR|txn\s*id)\s*[:\s]*([0-9]{12})/i);
    const utr = utrMatch ? utrMatch[1] : undefined;

    // 1. Generic Debit / Expense
    const debitMatch = clean.match(
      /(?:debited|paid|sent|transferred|spent)\s*(?:by|for|of)?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:(?:to|towards|at|for)\s+([^.]+?))?(?:\s+via|\s+on|\s+ref|\s+upi|\.|$)/i
    );

    if (debitMatch) {
      const amount = parseFloat(debitMatch[1].replace(/,/g, ''));
      let merchant = debitMatch[2]?.trim();
      if (merchant) {
        merchant = merchant.replace(/\s+(?:via|on|ref|upi).*$/i, '').trim();
      }

      if (!isNaN(amount) && amount > 0) {
        let confidence = 0.65;
        if (merchant) confidence += 0.15;
        if (utr) confidence += 0.15;

        return {
          amount,
          type: 'EXPENSE',
          merchant: merchant || undefined,
          utr,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          confidence: Math.min(confidence, 0.95),
          strategy: 'generic-upi',
        };
      }
    }

    // 2. Generic Credit / Income
    const creditMatch = clean.match(
      /(?:credited|received)\s*(?:by|with|of)?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:(?:from|by)\s+([^.]+?))?(?:\s+via|\s+on|\s+ref|\s+upi|\.|$)/i
    );

    if (creditMatch) {
      const amount = parseFloat(creditMatch[1].replace(/,/g, ''));
      let merchant = creditMatch[2]?.trim();
      if (merchant) {
        merchant = merchant.replace(/\s+(?:via|on|ref|upi).*$/i, '').trim();
      }

      if (!isNaN(amount) && amount > 0) {
        let confidence = 0.65;
        if (merchant) confidence += 0.15;
        if (utr) confidence += 0.15;

        return {
          amount,
          type: 'INCOME',
          merchant: merchant || undefined,
          utr,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          confidence: Math.min(confidence, 0.95),
          strategy: 'generic-upi',
        };
      }
    }

    return null;
  },
};
