/**
 * Sanitizes incoming notification/SMS text BEFORE database storage or parsing.
 * Strips OTPs, bank account numbers, and available balance alerts.
 */
export function scrubRawPayload(raw: string): string {
  if (!raw) return '';
  let scrubbed = raw;

  // 1. Strip OTPs (e.g., "OTP is 492019", "code: 5839", "verification code 123456")
  scrubbed = scrubbed.replace(
    /\b(?:otp|code|verification code|one time password|secret code)\s*(?:is|:)?\s*([0-9]{4,8})\b/gi,
    '[OTP_REDACTED]'
  );

  // 2. Mask Bank Account numbers (e.g., "A/c ending 4821", "A/C **9182", "acct #123456", "A/c no. XX9918")
  scrubbed = scrubbed.replace(
    /\b(?:a\/c|acct|account)\s*(?:no\.?|number)?\s*[:#]?\s*(?:[xX*]+|ending\s+(?:in\s+)?|[0-9]{2,4}[xX*]+)?(\d{3,6})\b/gi,
    'A/c [REDACTED]'
  );

  // 3. Strip remaining available balances (e.g., "Avl Bal Rs 14,250.00", "Balance: INR 5000", "Bal: Rs.1,234.50")
  scrubbed = scrubbed.replace(
    /\b(?:avl\s+bal|avail(?:able)?\s+bal(?:ance)?|bal(?:ance)?|tot\s+bal|clear\s+bal)\s*(?:is|:)?\s*(?:rs\.?|inr|₹)?\s*[\d,]+(?:\.\d{2})?\b/gi,
    '[BAL_REDACTED]'
  );

  return scrubbed.trim();
}
