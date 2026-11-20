import { ParserStrategy, ParsedTxn } from '../types';

/**
 * Parses HDFC Bank SMS:
 * e.g. "Sent Rs.450.00 from HDFC Bank A/c [REDACTED] to Starbucks on 20-11-26 via UPI. Ref 432589012345"
 * e.g. "debited by Rs 1,299.00 on 20-Nov-26 transfer to Swiggy UPI Ref 432589012345"
 */
export const hdfcSmsParser: ParserStrategy = {
  name: 'hdfc-sms',

  matches(pkg: string, text: string): boolean {
    const p = (pkg || '').toLowerCase();
    const t = (text || '').toLowerCase();
    return p.includes('hdfc') || t.includes('hdfc bank') || t.includes('hdfcbk');
  },

  parse(text: string, timestamp?: number): ParsedTxn | null {
    const clean = text.replace(/\s+/g, ' ').trim();

    // 1. Debit
    const debitMatch = clean.match(
      /(?:debited\s*(?:by|for)?|sent)\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:from\s+[^.]+?\s+)?(?:to|towards|transfer\s+to)\s*([^.]+?)(?:\s+on|\s+via|\s+UPI|\s+Ref|\.|$)/i
    );

    const utrMatch = clean.match(/(?:UPI\s*Ref(?:\s*no)?|Ref(?:\s*no)?|UTR)\s*[:\s]*([0-9]{12})/i);
    const utr = utrMatch ? utrMatch[1] : undefined;

    if (debitMatch) {
      const amount = parseFloat(debitMatch[1].replace(/,/g, ''));
      let merchant = debitMatch[2]?.trim();
      // Clean merchant trailing words
      merchant = merchant.replace(/\s+(?:on|via|ref|upi).*$/i, '').trim();

      if (!isNaN(amount) && amount > 0) {
        return {
          amount,
          type: 'EXPENSE',
          merchant: merchant || undefined,
          utr,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          confidence: utr && merchant ? 0.95 : 0.85,
          strategy: 'hdfc-sms',
        };
      }
    }

    // 2. Credit
    const creditMatch = clean.match(
      /(?:credited\s*(?:with|by)?|received)\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:from\s+)?([^.]+?)(?:\s+on|\s+via|\s+UPI|\s+Ref|\.|$)/i
    );
    if (creditMatch) {
      const amount = parseFloat(creditMatch[1].replace(/,/g, ''));
      let merchant = creditMatch[2]?.trim();
      merchant = merchant.replace(/\s+(?:on|via|ref|upi).*$/i, '').trim();

      if (!isNaN(amount) && amount > 0) {
        return {
          amount,
          type: 'INCOME',
          merchant: merchant || undefined,
          utr,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          confidence: utr && merchant ? 0.95 : 0.85,
          strategy: 'hdfc-sms',
        };
      }
    }

    return null;
  },
};
