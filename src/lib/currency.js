export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar ($)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar ($)' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)' },
  { code: 'SGD', symbol: 'SG$', name: 'Singapore Dollar ($)' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc (CHF)' },
];

/**
 * Formats a numeric amount with the selected currency symbol & tabular formatting
 */
export function formatCurrency(amount, currencyCode = 'USD') {
  const num = Number(amount || 0);
  const curr = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];

  // JPY typically uses 0 decimal places, others use 2
  const decimals = currencyCode === 'JPY' ? 0 : 2;

  const formattedNum = num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${curr.symbol}${formattedNum}`;
}
