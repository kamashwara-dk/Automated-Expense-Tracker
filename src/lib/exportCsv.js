/**
 * Generates and triggers download of a CSV file from transaction data
 */
export function exportTransactionsToCsv(transactions = [], currencyCode = 'USD') {
  if (!transactions || transactions.length === 0) {
    // Caller is responsible for showing feedback — do not use alert()
    return false;
  }

  const headers = ['Transaction ID', 'Date', 'Merchant', 'Category', `Amount (${currencyCode})`].join(',');

  const rows = transactions.map((tx) => {
    const dateStr = new Date(tx.date).toISOString().split('T')[0];
    const merchantEscaped = `"${(tx.merchant || '').replace(/"/g, '""')}"`;
    const categoryEscaped = `"${(tx.category || '').replace(/"/g, '""')}"`;
    const amountStr = Number(tx.amount || 0).toFixed(2);

    return [tx.id, dateStr, merchantEscaped, categoryEscaped, amountStr].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `autospend_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}
