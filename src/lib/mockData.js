import { formatDayName } from './dateUtils';

// 100% clean slate: Zero pre-created sample data
export const MOCK_TRANSACTIONS = [];

/**
 * Calculates 7-day stats, comparisons, and daily chart series from transactions
 */
export function calculateWeeklyStats(transactions = []) {
  const baseDate = new Date();
  const sevenDaysAgo = new Date(baseDate.getTime() - 7 * 86400000);
  const fourteenDaysAgo = new Date(baseDate.getTime() - 14 * 86400000);

  let current7Total = 0;
  let previous7Total = 0;

  // Initialize daily chart data for the last 7 days
  const daysMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate.getTime() - i * 86400000);
    const dayName = formatDayName(d);
    const key = d.toISOString().split('T')[0];
    daysMap[key] = { day: dayName, date: key, amount: 0 };
  }

  transactions.forEach((tx) => {
    const txDate = new Date(tx.date);
    const amount = Number(tx.amount || 0);

    if (txDate >= sevenDaysAgo && txDate <= baseDate) {
      current7Total += amount;
      const key = txDate.toISOString().split('T')[0];
      if (daysMap[key]) {
        daysMap[key].amount += amount;
      }
    } else if (txDate >= fourteenDaysAgo && txDate < sevenDaysAgo) {
      previous7Total += amount;
    }
  });

  let pctChange = 0;
  if (previous7Total > 0) {
    pctChange = ((current7Total - previous7Total) / previous7Total) * 100;
  } else if (current7Total > 0) {
    pctChange = 100;
  }

  const chartData = Object.values(daysMap);

  return {
    current7Total,
    previous7Total,
    pctChange,
    isIncrease: pctChange > 0,
    dailyAvg: current7Total / 7,
    chartData,
  };
}

/**
 * Determines AI Feedback state based on spending velocity
 */
export function getAIFeedbackState(current7Total, previous7Total, overrideState = null) {
  if (overrideState) return overrideState;

  const pctChange = previous7Total > 0 ? ((current7Total - previous7Total) / previous7Total) * 100 : 0;

  if (pctChange > 20 || current7Total > 300) {
    return 'critical';
  }
  if (pctChange > 5 || current7Total > 180) {
    return 'warning';
  }
  return 'optimal';
}
