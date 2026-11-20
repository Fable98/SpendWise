import { ParserStrategy, ParsedTxn } from './types';
import { gpayNotificationParser } from './strategies/gpay';
import { hdfcSmsParser } from './strategies/hdfc';
import { sbiSmsParser } from './strategies/sbi';
import { genericUpiParser } from './strategies/generic';

const strategies: ParserStrategy[] = [
  gpayNotificationParser,
  hdfcSmsParser,
  sbiSmsParser,
  genericUpiParser,
];

/**
 * Executes registered strategies sequentially until a matching parser
 * successfully extracts financial transaction details.
 */
export function parseUpi(pkg: string, text: string, timestamp?: number): ParsedTxn | null {
  if (!text) return null;

  for (const strategy of strategies) {
    try {
      if (!strategy.matches(pkg, text)) continue;
      const result = strategy.parse(text, timestamp);
      if (result) return result;
    } catch {
      // Continue to next strategy on unexpected parsing exception
      continue;
    }
  }

  return null;
}
