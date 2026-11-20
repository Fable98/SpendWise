import { TransactionType } from '@prisma/client';
import { prisma } from '../../../config/prisma';

interface DefaultDictionaryMapping {
  categoryName: string;
  keywords: string[];
}

const DEFAULT_MERCHANT_DICTIONARY: DefaultDictionaryMapping[] = [
  {
    categoryName: 'Food & Dining',
    keywords: [
      'swiggy',
      'zomato',
      'starbucks',
      'mcdonalds',
      'mcdonald',
      'dominos',
      'pizza hut',
      'burger king',
      'kfc',
      'chai point',
      'chaayos',
      'subway',
      'cafe coffee day',
      'ccd',
      'restaurant',
      'baker',
      'diner',
    ],
  },
  {
    categoryName: 'Transportation',
    keywords: [
      'uber',
      'ola',
      'rapido',
      'metro',
      'shell',
      'hpcl',
      'bpcl',
      'petrol',
      'fuel',
      'fastag',
      'toll',
      'parking',
      'irctc',
    ],
  },
  {
    categoryName: 'Shopping',
    keywords: [
      'amazon',
      'flipkart',
      'myntra',
      'zara',
      'h&m',
      'croma',
      'reliance digital',
      'reliance retail',
      'meesho',
      'ajio',
      'nykaa',
      'tata cliq',
    ],
  },
  {
    categoryName: 'Entertainment',
    keywords: [
      'bookmyshow',
      'pvr',
      'inox',
      'netflix',
      'spotify',
      'prime video',
      'hotstar',
      'youtube',
      'steam',
      'playstation',
    ],
  },
  {
    categoryName: 'Bills & Utilities',
    keywords: [
      'bescom',
      'tata power',
      'airtel',
      'jio',
      'vi',
      'vodafone',
      'broadband',
      'electricity',
      'gas',
      'water bill',
      'recharge',
    ],
  },
  {
    categoryName: 'Healthcare',
    keywords: [
      'apollo',
      '1mg',
      'pharmeasy',
      'medplus',
      'pharmacy',
      'hospital',
      'clinic',
      'dr ',
      'diagnostics',
      'lab',
    ],
  },
  {
    categoryName: 'Travel',
    keywords: [
      'makemytrip',
      'goibibo',
      'cleartrip',
      'indigo',
      'air india',
      'vistara',
      'hotel',
      'resort',
      'airbnb',
    ],
  },
];

/**
 * Resolves the best category for an incoming merchant.
 * Priority:
 * 1. User-defined CategoryRules
 * 2. Built-in merchant dictionary
 * 3. Fallback to default 'Other Expenses' / 'Other Income'
 */
export async function resolveCategory(
  userId: string,
  merchantName: string | undefined,
  type: TransactionType
): Promise<{ id: string; name: string }> {
  const normalized = (merchantName || '').toLowerCase().trim();

  // 1. Check user custom rules first
  if (normalized) {
    const userRules = await prisma.categoryRule.findMany({
      where: { userId },
      orderBy: { priority: 'desc' },
      include: { category: true },
    });

    for (const rule of userRules) {
      if (rule.category.type === type && normalized.includes(rule.keyword.toLowerCase())) {
        return { id: rule.category.id, name: rule.category.name };
      }
    }
  }

  // Fetch available categories for this user
  const categories = await prisma.category.findMany({
    where: {
      type,
      OR: [{ userId: null }, { userId }],
    },
  });

  // 2. Check built-in merchant dictionary
  if (normalized) {
    for (const dict of DEFAULT_MERCHANT_DICTIONARY) {
      const isMatch = dict.keywords.some((kw) => normalized.includes(kw));
      if (isMatch) {
        const matchedCategory = categories.find(
          (c) => c.name.toLowerCase() === dict.categoryName.toLowerCase()
        );
        if (matchedCategory) {
          return { id: matchedCategory.id, name: matchedCategory.name };
        }
      }
    }
  }

  // 3. Fallback category
  const fallbackName = type === 'EXPENSE' ? 'Other Expenses' : 'Other Income';
  const defaultCat =
    categories.find((c) => c.name.toLowerCase() === fallbackName.toLowerCase()) ||
    categories[0];

  if (!defaultCat) {
    // If no category exists at all, dynamically create a fallback
    const created = await prisma.category.create({
      data: {
        name: fallbackName,
        type,
        userId,
      },
    });
    return { id: created.id, name: created.name };
  }

  return { id: defaultCat.id, name: defaultCat.name };
}
