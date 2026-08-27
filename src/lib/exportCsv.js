/**
 * Generates and triggers a CSV or PDF-style text download
 * with customizable sort, date range, and category filtering.
 */

/**
 * @param {Array}  transactions
 * @param {string} currencyCode
 * @param {Object} options
 *   dateFrom    {string|null}  YYYY-MM-DD
 *   dateTo      {string|null}  YYYY-MM-DD
 *   sortBy      {'date-desc'|'date-asc'|'amount-desc'|'amount-asc'}
 *   category    {string|null}  filter to a single category, or null for all
 *   format      {'csv'|'txt'}
 */
export function exportTransactions(transactions = [], currencyCode = 'USD', options = {}) {
  const {
    dateFrom  = null,
    dateTo    = null,
    sortBy    = 'date-desc',
    category  = null,
    format    = 'csv',
  } = options;

  if (!transactions || transactions.length === 0) return false;

  // ── Filter ────────────────────────────────────────────────────────────────
  let filtered = [...transactions];

  if (dateFrom) {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    filtered = filtered.filter((tx) => new Date(tx.date) >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    filtered = filtered.filter((tx) => new Date(tx.date) <= to);
  }
  if (category && category !== 'All') {
    filtered = filtered.filter((tx) => tx.category === category);
  }

  if (filtered.length === 0) return false;

  // ── Sort ──────────────────────────────────────────────────────────────────
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'date-asc':    return new Date(a.date) - new Date(b.date);
      case 'amount-desc': return Number(b.amount) - Number(a.amount);
      case 'amount-asc':  return Number(a.amount) - Number(b.amount);
      default:            return new Date(b.date) - new Date(a.date); // date-desc
    }
  });

  const total = filtered.reduce((s, tx) => s + Number(tx.amount || 0), 0);

  if (format === 'txt') {
    return exportTxt(filtered, currencyCode, total, options);
  }
  return exportCsv(filtered, currencyCode, total);
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCsv(filtered, currencyCode, total) {
  const headers = ['#', 'Date', 'Merchant', 'Category', `Amount (${currencyCode})`].join(',');

  const rows = filtered.map((tx, i) => {
    const dateStr  = new Date(tx.date).toLocaleDateString('en-GB');
    const merchant = `"${(tx.merchant || '').replace(/"/g, '""')}"`;
    const category = `"${(tx.category || '').replace(/"/g, '""')}"`;
    const amount   = Number(tx.amount || 0).toFixed(2);
    return [i + 1, dateStr, merchant, category, amount].join(',');
  });

  const totalRow = `,,,"TOTAL",${total.toFixed(2)}`;
  const csv = [headers, ...rows, '', totalRow].join('\n');

  triggerDownload(
    'data:text/csv;charset=utf-8,' + encodeURIComponent(csv),
    `valuta_export_${today()}.csv`
  );
  return filtered.length;
}

// ── Plain-text report export ──────────────────────────────────────────────────
function exportTxt(filtered, currencyCode, total, options) {
  const lines = [
    '═══════════════════════════════════════════',
    '         MY VALUTA — EXPENSE REPORT        ',
    '═══════════════════════════════════════════',
    `Generated : ${new Date().toLocaleString()}`,
    `Currency  : ${currencyCode}`,
    options.dateFrom || options.dateTo
      ? `Period    : ${options.dateFrom || '—'} → ${options.dateTo || '—'}`
      : `Period    : All time`,
    options.category && options.category !== 'All'
      ? `Category  : ${options.category}`
      : `Category  : All`,
    `Sort      : ${options.sortBy || 'date-desc'}`,
    `Records   : ${filtered.length}`,
    '───────────────────────────────────────────',
    '',
  ];

  filtered.forEach((tx, i) => {
    const date = new Date(tx.date).toLocaleDateString('en-GB');
    const amt  = Number(tx.amount || 0).toFixed(2).padStart(12);
    lines.push(
      `${String(i + 1).padStart(3)}.  ${date}  ${(tx.merchant || '').padEnd(28).substring(0, 28)}  ${amt} ${currencyCode}`
    );
    lines.push(`       Category: ${tx.category || '—'}`);
    lines.push('');
  });

  lines.push('───────────────────────────────────────────');
  lines.push(`TOTAL: ${total.toFixed(2)} ${currencyCode}`);
  lines.push('═══════════════════════════════════════════');

  triggerDownload(
    'data:text/plain;charset=utf-8,' + encodeURIComponent(lines.join('\n')),
    `valuta_report_${today()}.txt`
  );
  return filtered.length;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function triggerDownload(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

/** Keep backward compatibility with old direct CSV call */
export function exportTransactionsToCsv(transactions = [], currencyCode = 'USD') {
  return exportTransactions(transactions, currencyCode, { sortBy: 'date-desc', format: 'csv' });
}
