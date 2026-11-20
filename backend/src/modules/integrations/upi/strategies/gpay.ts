import { ParserStrategy, ParsedTxn } from '../types';

/**
 * Parses Google Pay Android push notifications:
 * Package: com.google.android.apps.nbu.paisa.user
 * Examples:
 * - "Paid ₹450.00 to Starbucks Coffee. UPI Ref: 432589012345"
 * - "You paid ₹120 to Shell Petrol Pump"
 * - "Received ₹1,500 from Rahul Sharma. UPI Ref: 432589099887"
 */
export const gpayNotificationParser: ParserStrategy = {
  name: 'gpay-notification',

  matches(pkg: string, text: string): boolean {
    const p = (pkg || '').toLowerCase();
    const t = (text || '').toLowerCase();
    return (
      p.includes('com.google.android.apps.nbu.paisa.user') ||
      p.includes('googlepay') ||
      p.includes('gpay') ||
      t.includes('google pay') ||
      t.includes('gpay')
    );
  },

  parse(text: string, timestamp?: number): ParsedTxn | null {
    const clean = text.replace(/\s+/g, ' ').trim();

    // 1. Paid pattern with optional UTR
    // "Paid ₹450.00 to Starbucks Coffee. UPI Ref: 432589012345"
    // "You paid ₹1,250 to Blinkit"
    const paidMatch = clean.match(
      /(?:You\s+)?Paid\s+(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:to|towards)\s+([^.]+?)(?:\.\s*UPI\s*Ref[:\s]*([0-9]{12}))?(?:\.|$)/i
    );

    if (paidMatch) {
      const amount = parseFloat(paidMatch[1].replace(/,/g, ''));
      const merchant = paidMatch[2].trim();
      const utr = paidMatch[3]?.trim();

      if (!isNaN(amount) && amount > 0) {
        return {
          amount,
          type: 'EXPENSE',
          merchant: merchant || undefined,
          utr: utr || undefined,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          confidence: utr && merchant ? 1.0 : merchant ? 0.92 : 0.75,
          strategy: 'gpay-notification',
        };
      }
    }

    // 2. Received pattern
    // "Received ₹1,500 from Rahul Sharma. UPI Ref: 432589099887"
    const receivedMatch = clean.match(
      /(?:You\s+)?Received\s+(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)\s+from\s+([^.]+?)(?:\.\s*UPI\s*Ref[:\s]*([0-9]{12}))?(?:\.|$)/i
    );

    if (receivedMatch) {
      const amount = parseFloat(receivedMatch[1].replace(/,/g, ''));
      const merchant = receivedMatch[2].trim();
      const utr = receivedMatch[3]?.trim();

      if (!isNaN(amount) && amount > 0) {
        return {
          amount,
          type: 'INCOME',
          merchant: merchant || undefined,
          utr: utr || undefined,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          confidence: utr && merchant ? 1.0 : merchant ? 0.92 : 0.75,
          strategy: 'gpay-notification',
        };
      }
    }

    // 3. Fallback simpler GPay paid match
    // "You paid ₹50 to Chai Point"
    const simplePaid = clean.match(
      /(?:Sent|Transferred|Paid)\s+(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)\s+to\s+([^.]+)/i
    );
    if (simplePaid) {
      const amount = parseFloat(simplePaid[1].replace(/,/g, ''));
      const merchant = simplePaid[2].trim();
      if (!isNaN(amount) && amount > 0) {
        return {
          amount,
          type: 'EXPENSE',
          merchant,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          confidence: 0.88,
          strategy: 'gpay-notification',
        };
      }
    }

    return null;
  },
};
